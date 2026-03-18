from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import Dict, Optional
import asyncio
import threading
from datetime import datetime
import queue

from app.models.database import get_db, TestCase, TestExecution, DataRecord
from app.models.schemas import TestExecutionOut
from app.services.runner import TestRunner
from pydantic import BaseModel

router = APIRouter()

# Per-execution live log queues: exec_id -> queue.Queue
live_log_queues: Dict[int, queue.Queue] = {}


class RunRequest(BaseModel):
    target_url: Optional[str] = None


@router.post("/{tc_id}/run", response_model=TestExecutionOut)
def run_test(tc_id: int, body: RunRequest = None, db: Session = Depends(get_db)):
    tc = db.query(TestCase).filter(TestCase.id == tc_id).first()
    if not tc:
        raise HTTPException(404, "Test case not found")

    # Build dataset substitution dict
    dataset = {}
    if tc.dataset_id:
        records = db.query(DataRecord).filter(DataRecord.dataset_id == tc.dataset_id).all()
        dataset = {r.key: r.value for r in records}

    # Resolve base/target URL
    override_url = (body.target_url.strip() if body and body.target_url else "") or (tc.target_url or "").strip()
    base_url = override_url

    # Patch steps: ensure first navigate uses the override URL
    steps = list(tc.steps or [])
    if override_url:
        patched, patched_nav = [], False
        for step in steps:
            s = dict(step)
            if not patched_nav and s.get("action") == "navigate":
                existing = (s.get("value") or "").strip()
                # Replace if empty or relative
                if not existing or not existing.startswith("http"):
                    s["value"] = override_url
                patched_nav = True
            patched.append(s)
        if not patched_nav:
            patched = [{"action": "navigate", "value": override_url, "wait": 2,
                        "description": "Navigate to target URL"}] + patched
        steps = patched

    # Create execution record
    execution = TestExecution(
        test_case_id=tc_id,
        status="running",
        started_at=datetime.utcnow(),
        logs=[],
        screenshots=[],
    )
    db.add(execution)
    db.commit()
    db.refresh(execution)

    exec_id = execution.id
    log_queue: queue.Queue = queue.Queue()
    live_log_queues[exec_id] = log_queue

    def _run():
        runner = TestRunner(headless=True)

        # Thread-safe: queue.put needs no asyncio
        def on_log(entry):
            log_queue.put(entry)

        result = runner.run(steps, dataset, callback=on_log, base_url=base_url)

        # Signal WebSocket consumer that execution is done
        log_queue.put(None)

        # Persist to DB
        from app.models.database import SessionLocal
        with SessionLocal() as session:
            ex = session.query(TestExecution).filter(TestExecution.id == exec_id).first()
            if ex:
                ex.status = result["status"]
                ex.completed_at = datetime.utcnow()
                ex.duration = result.get("duration")
                ex.logs = result.get("logs", [])
                ex.screenshots = result.get("screenshots", [])
                ex.error_message = result.get("error")
                session.commit()

        live_log_queues.pop(exec_id, None)

    thread = threading.Thread(target=_run, daemon=True, name=f"exec-{exec_id}")
    thread.start()

    return execution


@router.websocket("/{exec_id}/ws")
async def execution_ws(exec_id: int, websocket: WebSocket):
    await websocket.accept()

    # Send immediate acknowledgement so the terminal shows activity right away
    await websocket.send_json({
        "type": "log",
        "data": {
            "timestamp": datetime.utcnow().isoformat(),
            "level": "info",
            "message": f"⚡ Connected to execution #{exec_id} — waiting for runner to start…"
        }
    })

    # Wait up to 5s for the thread to register its queue
    for _ in range(50):
        if exec_id in live_log_queues:
            break
        await asyncio.sleep(0.1)

    if exec_id not in live_log_queues:
        await websocket.send_json({
            "type": "log",
            "data": {
                "timestamp": datetime.utcnow().isoformat(),
                "level": "warning",
                "message": "⚠ Execution already completed or not found — fetching stored results…"
            }
        })
        await websocket.send_json({"type": "done"})
        await websocket.close()
        return

    log_queue = live_log_queues[exec_id]
    loop = asyncio.get_event_loop()

    # Heartbeat: send a ping every 2s while waiting for logs, so terminal isn't blank
    POLL_TIMEOUT = 0.25   # seconds to block on queue.get before looping
    last_heartbeat = asyncio.get_event_loop().time()

    try:
        while True:
            now = loop.time()

            # Non-blocking queue poll
            try:
                entry = await loop.run_in_executor(
                    None,
                    lambda: log_queue.get(timeout=POLL_TIMEOUT)
                )
            except queue.Empty:
                # Send heartbeat ping if we've been quiet for >2s
                if loop.time() - last_heartbeat > 2.0:
                    if exec_id in live_log_queues:
                        await websocket.send_json({
                            "type": "heartbeat",
                            "data": {"timestamp": datetime.utcnow().isoformat(), "level": "info",
                                     "message": "⏳ Runner is working… (Chrome may be initializing)"}
                        })
                    last_heartbeat = loop.time()

                # If queue gone, runner finished
                if exec_id not in live_log_queues:
                    await websocket.send_json({"type": "done"})
                    break
                continue
            except Exception:
                break

            if entry is None:
                # Sentinel — runner is done
                await websocket.send_json({"type": "done"})
                break

            await websocket.send_json({"type": "log", "data": entry})
            last_heartbeat = loop.time()

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass


@router.get("/all")
def get_all_executions(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    execs = (
        db.query(TestExecution)
        .order_by(TestExecution.started_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        {
            "id": e.id,
            "test_case_id": e.test_case_id,
            "test_case_name": e.test_case.name if e.test_case else "Unknown",
            "status": e.status,
            "started_at": e.started_at.isoformat() if e.started_at else None,
            "completed_at": e.completed_at.isoformat() if e.completed_at else None,
            "duration": e.duration,
            "error_message": e.error_message,
            "screenshots": e.screenshots or [],
            "logs": e.logs or [],
        }
        for e in execs
    ]


@router.get("/{exec_id}", response_model=TestExecutionOut)
def get_execution(exec_id: int, db: Session = Depends(get_db)):
    ex = db.query(TestExecution).filter(TestExecution.id == exec_id).first()
    if not ex:
        raise HTTPException(404, "Execution not found")
    return ex
