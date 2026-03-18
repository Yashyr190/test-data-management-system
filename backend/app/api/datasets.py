from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json
from datetime import datetime

from app.models.database import get_db, Dataset, DataRecord, DatasetVersion
from app.models.schemas import DatasetCreate, DatasetOut, DatasetUpdate, DataRecordCreate, DataRecordOut, DatasetVersionOut

router = APIRouter()


def bump_version(current: str) -> str:
    parts = current.split(".")
    parts[-1] = str(int(parts[-1]) + 1)
    return ".".join(parts)


@router.get("/", response_model=List[DatasetOut])
def list_datasets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Dataset).offset(skip).limit(limit).all()


@router.post("/", response_model=DatasetOut)
def create_dataset(payload: DatasetCreate, db: Session = Depends(get_db)):
    ds = Dataset(
        name=payload.name,
        description=payload.description,
        category=payload.category,
        tags=payload.tags,
        version="1.0.0",
    )
    db.add(ds)
    db.flush()
    for rec in payload.records:
        db.add(DataRecord(dataset_id=ds.id, **rec.model_dump()))
    # snapshot initial version
    db.add(DatasetVersion(
        dataset_id=ds.id,
        version="1.0.0",
        snapshot=[r.model_dump() for r in payload.records],
        changelog="Initial version",
    ))
    db.commit()
    db.refresh(ds)
    return ds


@router.get("/{dataset_id}", response_model=DatasetOut)
def get_dataset(dataset_id: int, db: Session = Depends(get_db)):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not ds:
        raise HTTPException(404, "Dataset not found")
    return ds


@router.put("/{dataset_id}", response_model=DatasetOut)
def update_dataset(dataset_id: int, payload: DatasetUpdate, db: Session = Depends(get_db)):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not ds:
        raise HTTPException(404, "Dataset not found")
    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(ds, field, val)
    ds.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ds)
    return ds


@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: int, db: Session = Depends(get_db)):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not ds:
        raise HTTPException(404, "Dataset not found")
    db.delete(ds)
    db.commit()
    return {"deleted": True}


@router.post("/{dataset_id}/records", response_model=DataRecordOut)
def add_record(dataset_id: int, payload: DataRecordCreate, db: Session = Depends(get_db)):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not ds:
        raise HTTPException(404, "Dataset not found")
    rec = DataRecord(dataset_id=dataset_id, **payload.model_dump())
    db.add(rec)
    # version bump
    new_ver = bump_version(ds.version)
    ds.version = new_ver
    ds.updated_at = datetime.utcnow()
    snapshot = [{"key": r.key, "value": r.value, "data_type": r.data_type} for r in ds.records] + [payload.model_dump()]
    db.add(DatasetVersion(dataset_id=dataset_id, version=new_ver, snapshot=snapshot, changelog=f"Added record: {payload.key}"))
    db.commit()
    db.refresh(rec)
    return rec


@router.delete("/{dataset_id}/records/{record_id}")
def delete_record(dataset_id: int, record_id: int, db: Session = Depends(get_db)):
    rec = db.query(DataRecord).filter(DataRecord.id == record_id, DataRecord.dataset_id == dataset_id).first()
    if not rec:
        raise HTTPException(404, "Record not found")
    db.delete(rec)
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    new_ver = bump_version(ds.version)
    ds.version = new_ver
    ds.updated_at = datetime.utcnow()
    db.commit()
    return {"deleted": True}


@router.get("/{dataset_id}/versions", response_model=List[DatasetVersionOut])
def get_versions(dataset_id: int, db: Session = Depends(get_db)):
    return db.query(DatasetVersion).filter(DatasetVersion.dataset_id == dataset_id).order_by(DatasetVersion.created_at.desc()).all()


@router.get("/stats/summary")
def stats(db: Session = Depends(get_db)):
    total_datasets = db.query(Dataset).count()
    total_records = db.query(DataRecord).count()
    categories = db.query(Dataset.category).distinct().all()
    return {
        "total_datasets": total_datasets,
        "total_records": total_records,
        "categories": [c[0] for c in categories if c[0]],
    }
