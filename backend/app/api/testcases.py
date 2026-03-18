from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.models.database import get_db, TestCase, TestExecution
from app.models.schemas import TestCaseCreate, TestCaseOut, TestCaseUpdate, TestExecutionOut

router = APIRouter()


@router.get("/", response_model=List[TestCaseOut])
def list_test_cases(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(TestCase).offset(skip).limit(limit).all()


@router.post("/", response_model=TestCaseOut)
def create_test_case(payload: TestCaseCreate, db: Session = Depends(get_db)):
    tc = TestCase(**payload.model_dump())
    db.add(tc)
    db.commit()
    db.refresh(tc)
    return tc


@router.get("/{tc_id}", response_model=TestCaseOut)
def get_test_case(tc_id: int, db: Session = Depends(get_db)):
    tc = db.query(TestCase).filter(TestCase.id == tc_id).first()
    if not tc:
        raise HTTPException(404, "Test case not found")
    return tc


@router.put("/{tc_id}", response_model=TestCaseOut)
def update_test_case(tc_id: int, payload: TestCaseUpdate, db: Session = Depends(get_db)):
    tc = db.query(TestCase).filter(TestCase.id == tc_id).first()
    if not tc:
        raise HTTPException(404, "Test case not found")
    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(tc, field, val)
    db.commit()
    db.refresh(tc)
    return tc


@router.delete("/{tc_id}")
def delete_test_case(tc_id: int, db: Session = Depends(get_db)):
    tc = db.query(TestCase).filter(TestCase.id == tc_id).first()
    if not tc:
        raise HTTPException(404, "Test case not found")
    db.delete(tc)
    db.commit()
    return {"deleted": True}


@router.get("/{tc_id}/executions", response_model=List[TestExecutionOut])
def get_executions(tc_id: int, db: Session = Depends(get_db)):
    return db.query(TestExecution).filter(TestExecution.test_case_id == tc_id).order_by(TestExecution.started_at.desc()).all()


@router.get("/stats/summary")
def stats(db: Session = Depends(get_db)):
    total = db.query(TestCase).count()
    passed = db.query(TestExecution).filter(TestExecution.status == "passed").count()
    failed = db.query(TestExecution).filter(TestExecution.status == "failed").count()
    running = db.query(TestExecution).filter(TestExecution.status == "running").count()
    return {"total_test_cases": total, "passed": passed, "failed": failed, "running": running}
