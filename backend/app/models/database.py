from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./tdms.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class Dataset(Base):
    __tablename__ = "datasets"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100))
    version = Column(String(50), default="1.0.0")
    tags = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    records = relationship("DataRecord", back_populates="dataset", cascade="all, delete-orphan")
    versions = relationship("DatasetVersion", back_populates="dataset", cascade="all, delete-orphan")


class DataRecord(Base):
    __tablename__ = "data_records"
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"))
    key = Column(String(255), nullable=False)
    value = Column(Text)
    data_type = Column(String(50), default="string")
    is_sensitive = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    dataset = relationship("Dataset", back_populates="records")


class DatasetVersion(Base):
    __tablename__ = "dataset_versions"
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"))
    version = Column(String(50))
    snapshot = Column(JSON)
    changelog = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    dataset = relationship("Dataset", back_populates="versions")


class TestCase(Base):
    __tablename__ = "test_cases"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    test_type = Column(String(100))
    target_url = Column(String(500))
    steps = Column(JSON, default=list)
    expected_result = Column(Text)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True)
    priority = Column(String(50), default="medium")
    tags = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    executions = relationship("TestExecution", back_populates="test_case", cascade="all, delete-orphan")


class TestExecution(Base):
    __tablename__ = "test_executions"
    id = Column(Integer, primary_key=True, index=True)
    test_case_id = Column(Integer, ForeignKey("test_cases.id"))
    status = Column(String(50), default="pending")
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    duration = Column(Float)
    logs = Column(JSON, default=list)
    screenshots = Column(JSON, default=list)
    error_message = Column(Text)
    report_path = Column(String(500))
    test_case = relationship("TestCase", back_populates="executions")


class ManualTestData(Base):
    __tablename__ = "manual_test_data"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    fields = Column(JSON, default=dict)
    test_url = Column(String(500))
    expected_behavior = Column(Text)
    result = Column(String(50))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    tested_at = Column(DateTime)
