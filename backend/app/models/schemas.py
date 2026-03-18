from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from datetime import datetime


class DataRecordBase(BaseModel):
    key: str
    value: Optional[str] = None
    data_type: str = "string"
    is_sensitive: bool = False


class DataRecordCreate(DataRecordBase):
    pass


class DataRecordOut(DataRecordBase):
    id: int
    dataset_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class DatasetBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    tags: List[str] = []


class DatasetCreate(DatasetBase):
    records: List[DataRecordCreate] = []


class DatasetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None


class DatasetVersionOut(BaseModel):
    id: int
    version: str
    changelog: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class DatasetOut(DatasetBase):
    id: int
    version: str
    created_at: datetime
    updated_at: datetime
    records: List[DataRecordOut] = []

    class Config:
        from_attributes = True


class TestStep(BaseModel):
    action: str
    selector: Optional[str] = None
    value: Optional[str] = None
    wait: Optional[int] = None
    description: Optional[str] = None


class TestCaseBase(BaseModel):
    name: str
    description: Optional[str] = None
    test_type: str = "selenium"
    target_url: Optional[str] = None
    steps: List[TestStep] = []
    expected_result: Optional[str] = None
    dataset_id: Optional[int] = None
    priority: str = "medium"
    tags: List[str] = []


class TestCaseCreate(TestCaseBase):
    pass


class TestCaseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    steps: Optional[List[TestStep]] = None
    expected_result: Optional[str] = None
    priority: Optional[str] = None


class TestExecutionOut(BaseModel):
    id: int
    test_case_id: int
    status: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    duration: Optional[float]
    logs: List[Any] = []
    screenshots: List[str] = []
    error_message: Optional[str]
    report_path: Optional[str]

    class Config:
        from_attributes = True


class TestCaseOut(TestCaseBase):
    id: int
    created_at: datetime
    updated_at: datetime
    executions: List[TestExecutionOut] = []

    class Config:
        from_attributes = True


class ManualTestDataBase(BaseModel):
    name: str
    fields: Dict[str, Any] = {}
    test_url: Optional[str] = None
    expected_behavior: Optional[str] = None


class ManualTestDataCreate(ManualTestDataBase):
    pass


class ManualTestDataOut(ManualTestDataBase):
    id: int
    result: Optional[str]
    notes: Optional[str]
    created_at: datetime
    tested_at: Optional[datetime]

    class Config:
        from_attributes = True
