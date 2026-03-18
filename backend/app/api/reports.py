from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os
import json
from datetime import datetime
from jinja2 import Template

from app.models.database import get_db, TestExecution, TestCase

router = APIRouter()

REPORT_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Test Report - {{ title }}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif; background: #0a0a0a; color: #e8e8e8; padding: 40px; }
  h1 { font-size: 2rem; font-weight: 700; color: #fff; margin-bottom: 8px; }
  .subtitle { color: #888; margin-bottom: 40px; font-size: 0.9rem; }
  .summary { display: flex; gap: 20px; margin-bottom: 40px; flex-wrap: wrap; }
  .stat { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 20px 28px; flex: 1; min-width: 140px; }
  .stat-value { font-size: 2rem; font-weight: 700; }
  .stat-label { font-size: 0.8rem; color: #666; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
  .passed { color: #30d158; }
  .failed { color: #ff453a; }
  .running { color: #ffd60a; }
  .section { background: #111; border: 1px solid #222; border-radius: 12px; margin-bottom: 24px; overflow: hidden; }
  .section-header { padding: 16px 24px; border-bottom: 1px solid #222; display: flex; align-items: center; justify-content: space-between; }
  .section-header h3 { font-size: 1rem; font-weight: 600; }
  .badge { padding: 4px 12px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
  .badge-passed { background: rgba(48,209,88,0.15); color: #30d158; }
  .badge-failed { background: rgba(255,69,58,0.15); color: #ff453a; }
  .logs { padding: 16px 24px; max-height: 300px; overflow-y: auto; }
  .log-entry { padding: 4px 0; font-size: 0.82rem; font-family: 'SF Mono', monospace; border-bottom: 1px solid #1a1a1a; }
  .log-entry .ts { color: #555; margin-right: 8px; }
  .log-entry.error { color: #ff453a; }
  .screenshots { padding: 16px 24px; display: flex; gap: 12px; flex-wrap: wrap; }
  .screenshots img { width: 240px; height: 140px; object-fit: cover; border-radius: 8px; border: 1px solid #333; }
  .error-box { padding: 16px 24px; background: rgba(255,69,58,0.05); border-top: 1px solid rgba(255,69,58,0.2); }
  .error-box pre { color: #ff453a; font-size: 0.82rem; white-space: pre-wrap; }
  .meta { color: #666; font-size: 0.8rem; }
</style>
</head>
<body>
<h1>Test Execution Report</h1>
<p class="subtitle">Generated {{ generated_at }} &nbsp;·&nbsp; {{ title }}</p>

<div class="summary">
  <div class="stat"><div class="stat-value">{{ total }}</div><div class="stat-label">Total</div></div>
  <div class="stat"><div class="stat-value passed">{{ passed }}</div><div class="stat-label">Passed</div></div>
  <div class="stat"><div class="stat-value failed">{{ failed }}</div><div class="stat-label">Failed</div></div>
  <div class="stat"><div class="stat-value">{{ "%.2f"|format(avg_duration) }}s</div><div class="stat-label">Avg Duration</div></div>
</div>

{% for ex in executions %}
<div class="section">
  <div class="section-header">
    <div>
      <h3>{{ ex.test_case_name }}</h3>
      <div class="meta">ID #{{ ex.id }} &nbsp;·&nbsp; Duration: {{ ex.duration or 0 }}s &nbsp;·&nbsp; {{ ex.started_at }}</div>
    </div>
    <span class="badge badge-{{ ex.status }}">{{ ex.status.upper() }}</span>
  </div>

  {% if ex.logs %}
  <div class="logs">
    {% for log in ex.logs %}
    <div class="log-entry {{ 'error' if log.level == 'error' else '' }}">
      <span class="ts">[{{ log.timestamp[11:19] }}]</span>{{ log.message }}
    </div>
    {% endfor %}
  </div>
  {% endif %}

  {% if ex.screenshots %}
  <div class="screenshots">
    {% for sc in ex.screenshots %}
    <img src="{{ sc }}" alt="screenshot" />
    {% endfor %}
  </div>
  {% endif %}

  {% if ex.error_message %}
  <div class="error-box"><pre>Error: {{ ex.error_message }}</pre></div>
  {% endif %}
</div>
{% endfor %}
</body>
</html>
"""


@router.get("/generate/{tc_id}")
def generate_report(tc_id: int, db: Session = Depends(get_db)):
    tc = db.query(TestCase).filter(TestCase.id == tc_id).first()
    if not tc:
        raise HTTPException(404, "Test case not found")

    executions = db.query(TestExecution).filter(TestExecution.test_case_id == tc_id).order_by(TestExecution.started_at.desc()).limit(20).all()

    ex_data = []
    for ex in executions:
        ex_data.append({
            "id": ex.id,
            "test_case_name": tc.name,
            "status": ex.status,
            "duration": ex.duration,
            "started_at": ex.started_at.isoformat() if ex.started_at else "",
            "logs": ex.logs or [],
            "screenshots": ex.screenshots or [],
            "error_message": ex.error_message,
        })

    total = len(ex_data)
    passed = sum(1 for e in ex_data if e["status"] == "passed")
    failed = sum(1 for e in ex_data if e["status"] == "failed")
    durations = [e["duration"] for e in ex_data if e["duration"]]
    avg_dur = sum(durations) / len(durations) if durations else 0

    tmpl = Template(REPORT_TEMPLATE)
    html = tmpl.render(
        title=tc.name,
        generated_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
        executions=ex_data,
        total=total,
        passed=passed,
        failed=failed,
        avg_duration=avg_dur,
    )

    report_path = f"reports/report_{tc_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.html"
    with open(report_path, "w") as f:
        f.write(html)

    return {"report_url": f"/{report_path}", "path": report_path}


@router.get("/all")
def list_reports():
    reports = []
    if os.path.exists("reports"):
        for f in sorted(os.listdir("reports"), reverse=True):
            if f.endswith(".html"):
                reports.append({"filename": f, "url": f"/reports/{f}"})
    return reports


@router.get("/summary")
def summary(db: Session = Depends(get_db)):
    total = db.query(TestExecution).count()
    passed = db.query(TestExecution).filter(TestExecution.status == "passed").count()
    failed = db.query(TestExecution).filter(TestExecution.status == "failed").count()
    recent = db.query(TestExecution).order_by(TestExecution.started_at.desc()).limit(5).all()
    recent_data = [
        {
            "id": e.id,
            "test_case_id": e.test_case_id,
            "status": e.status,
            "duration": e.duration,
            "started_at": e.started_at.isoformat() if e.started_at else None,
        }
        for e in recent
    ]
    return {"total": total, "passed": passed, "failed": failed, "recent": recent_data}
