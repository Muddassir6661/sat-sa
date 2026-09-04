"""SAT-SA backend — serves the detection engine's findings to the dashboard."""

import io
import math
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# The detection package imports itself absolutely ("from detection.rules_engine
# import ...") and writes its CSV to a path relative to the repo root, so both
# sys.path and the working directory must point there before importing it.
REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))
os.chdir(REPO_ROOT)

import pandas as pd  # noqa: E402
from fastapi import FastAPI, File, HTTPException, UploadFile  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from backend.models import AlertsResponse, DetectionResult, Entity  # noqa: E402
from detection.dataset_generator import generate_new_dataset  # noqa: E402
from detection.detection import run_detection  # noqa: E402

CSV_PATH = REPO_ROOT / "detection" / "data" / "synthetic_alerts.csv"

# The full alert schema from the build guides. Detection itself only reads a
# subset of these, but validating against the whole documented contract gives
# an uploader a clear error now instead of a confusing one if a future rule
# starts reading a column that's silently missing today.
REQUIRED_COLUMNS = [
    "alert_id", "entity_id", "severity", "category", "disposition", "escalated",
    "time_opened", "time_closed", "closure_time_minutes", "investigation_notes",
    "asset_id", "analyst_id",
]

_state: dict = {"result": {"entities": []}, "records": []}


def _json_safe(records: list[dict]) -> list[dict]:
    """Open alerts carry NaN for time_closed/closure_time_minutes, and Starlette
    serialises with allow_nan=False -- so unsanitised records 500 the response."""
    return [
        {k: (None if isinstance(v, float) and math.isnan(v) else v) for k, v in row.items()}
        for row in records
    ]


def _ingest(records: list[dict]) -> dict:
    """Detection reads NaN via pandas, so it gets the raw records; only the copy
    cached for /api/alerts is sanitised."""
    _state["result"] = run_detection(records)
    _state["records"] = _json_safe(records)
    return _state["result"]


def _records_from_csv() -> list[dict]:
    return pd.read_csv(CSV_PATH).to_dict(orient="records")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _ingest(_records_from_csv() if CSV_PATH.exists() else generate_new_dataset())
    yield


app = FastAPI(title="SAT-SA API", version="1.0.0", lifespan=lifespan)

# The Vite dev server proxies /api, so this only matters when the browser or
# another tool hits port 8000 directly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/entities", response_model=DetectionResult)
def get_entities():
    return _state["result"]


@app.get("/api/entities/{entity_id}", response_model=Entity)
def get_entity(entity_id: str):
    for entity in _state["result"]["entities"]:
        if entity["entity_id"] == entity_id:
            return entity
    raise HTTPException(status_code=404, detail=f"Unknown entity: {entity_id}")


@app.get("/api/alerts", response_model=AlertsResponse)
def get_alerts():
    records = _state["records"]
    return {"alerts": records, "count": len(records)}


@app.post("/api/run-detection", response_model=DetectionResult)
def rerun_detection():
    return _ingest(_records_from_csv())


@app.post("/api/generate-dataset", response_model=DetectionResult)
def generate_dataset():
    return _ingest(generate_new_dataset(save_to_csv=True))


@app.post("/api/upload-dataset", response_model=DetectionResult)
async def upload_dataset(file: UploadFile = File(...)):
    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Not a valid CSV file: not UTF-8 text (looks like a binary or non-text file).",
        )
    except (pd.errors.EmptyDataError, pd.errors.ParserError) as e:
        raise HTTPException(status_code=400, detail=f"Not a valid CSV file: {e}")

    if df.empty:
        raise HTTPException(status_code=400, detail="The uploaded CSV has no rows.")

    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"CSV is missing required columns: {', '.join(missing)}",
        )

    try:
        return _ingest(df.to_dict(orient="records"))
    except Exception as e:
        # Detection expects specific dtypes per column (e.g. numeric closure
        # times); a malformed value can still raise this deep in pandas/sklearn
        # even though the columns all exist. Surface it as a clean 400 instead
        # of a raw traceback.
        raise HTTPException(status_code=400, detail=f"Could not process this dataset: {e}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
