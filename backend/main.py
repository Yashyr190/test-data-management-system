from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.api import datasets, testcases, execution, reports, manual
from app.models.database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Test Data Management System",
    description="Manage, version, and execute test data for automated testing",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("screenshots", exist_ok=True)
os.makedirs("reports", exist_ok=True)

app.mount("/screenshots", StaticFiles(directory="screenshots"), name="screenshots")
app.mount("/reports", StaticFiles(directory="reports"), name="reports")

app.include_router(datasets.router,   prefix="/api/datasets",   tags=["Datasets"])
app.include_router(testcases.router,  prefix="/api/testcases",  tags=["Test Cases"])
app.include_router(execution.router,  prefix="/api/execution",  tags=["Execution"])
app.include_router(reports.router,    prefix="/api/reports",    tags=["Reports"])
app.include_router(manual.router,     prefix="/api/manual",     tags=["Manual Testing"])


@app.get("/")
def root():
    return {"message": "TDMS API v1.0.0", "status": "running"}


@app.get("/api/health")
def health():
    return {"status": "healthy", "version": "1.0.0"}


# ── Stub routes for any legacy/external callers ─────────────────
@app.get("/api/runs")
def runs_stub():
    """Compatibility stub."""
    return []


@app.get("/api/environments")
def environments_stub():
    """Compatibility stub."""
    return []
