"""SAT-SA backend — serves the detection engine's findings to the dashboard."""

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
from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from backend.models import DetectionResult, Entity  # noqa: E402
from detection.dataset_generator import generate_new_dataset  # noqa: E402
from detection.detection import run_detection  # noqa: E402

CSV_PATH = REPO_ROOT / "detection" / "data" / "synthetic_alerts.csv"

_state: dict = {"result": {"entities": []}}


def _detect_from_csv() -> dict:
    df = pd.read_csv(CSV_PATH)
    return run_detection(df.to_dict(orient="records"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    _state["result"] = _detect_from_csv() if CSV_PATH.exists() else run_detection(generate_new_dataset())
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
