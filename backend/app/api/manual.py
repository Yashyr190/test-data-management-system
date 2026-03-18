from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.models.database import get_db, ManualTestData
from app.models.schemas import ManualTestDataCreate, ManualTestDataOut

router = APIRouter()


@router.get("/", response_model=List[ManualTestDataOut])
def list_manual(db: Session = Depends(get_db)):
    return db.query(ManualTestData).order_by(ManualTestData.created_at.desc()).all()


@router.post("/", response_model=ManualTestDataOut)
def create_manual(payload: ManualTestDataCreate, db: Session = Depends(get_db)):
    m = ManualTestData(**payload.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


@router.put("/{mid}/result")
def update_result(mid: int, result: str, notes: str = "", db: Session = Depends(get_db)):
    m = db.query(ManualTestData).filter(ManualTestData.id == mid).first()
    if not m:
        raise HTTPException(404, "Not found")
    m.result = result
    m.notes = notes
    m.tested_at = datetime.utcnow()
    db.commit()
    return {"updated": True}


@router.delete("/{mid}")
def delete_manual(mid: int, db: Session = Depends(get_db)):
    m = db.query(ManualTestData).filter(ManualTestData.id == mid).first()
    if not m:
        raise HTTPException(404, "Not found")
    db.delete(m)
    db.commit()
    return {"deleted": True}
