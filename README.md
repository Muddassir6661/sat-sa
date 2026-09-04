# SAT-SA — Supervisory Analytics Tool for SOC Assessment
SIH26157 (NTRO) — Blockchain & Cybersecurity theme

Reviews how a SOC *handled* its alerts — using case metadata, not raw security logs —
and flags the red flags a human supervisor would catch:

- **Execution gaps** — looked handled, wasn't (e.g. critical alerts closed in minutes with no escalation)
- **Negative space** — evidence suspiciously absent (e.g. a core asset with zero alerts all period)
- **Statistical anomalies** — entities that behave unlike their peers (Isolation Forest)

Runs fully offline. No cloud services, no external APIs at runtime.

## Structure
- `detection/` — dataset generator + rule engine + ML engine + main entry point
- `backend/` — FastAPI service exposing detection results
- `frontend/` — React dashboard (Vite; no dependencies beyond React itself)

## Setup
```
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt

cd frontend && npm install && cd ..
```

## Run

Two terminals, **both from the repo root**:

```
# terminal 1 — API on :8000
uvicorn backend.main:app --reload

# terminal 2 — dashboard on :5173
cd frontend && npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to the backend, so the browser stays
same-origin.

> Run the backend from the repo root. `detection/` uses package-absolute imports and
> writes its CSV to a repo-root-relative path. `backend/main.py` sets `sys.path` and the
> working directory to compensate, so `python backend/main.py` also works.

## API

| Method | Endpoint | Returns |
|---|---|---|
| GET | `/api/entities` | All entities with `risk_score` + `flags`, ranked desc |
| GET | `/api/entities/{entity_id}` | One entity in full; 404 if unknown |
| GET | `/api/alerts` | The underlying alert records the findings were drawn from |
| POST | `/api/run-detection` | Re-runs detection on the current CSV |
| POST | `/api/generate-dataset` | Generates a fresh dataset, re-runs detection, returns results |

Interactive docs at http://127.0.0.1:8000/docs.

## Dashboard

- **Findings** — entities ranked by risk, each flag showing the plain-language `reason`
  behind it. Export findings to CSV or JSON.
- **Dataset** — the full alert table, filterable by entity/severity/disposition and
  searchable across alert ID, notes, asset and analyst.
- **Evidence click-through** — alert IDs cited by a flag are clickable and jump to those
  exact rows in the Dataset tab, so any finding can be verified against the raw records.
- **Generate New Dataset** — builds a fresh synthetic dataset live and re-runs detection.

## Run detection standalone
```
python -m detection.detection
```
Outputs results to console and `detection/data/sample_output.json`.

## Contract

Backend imports `run_detection(records: list[dict]) -> dict` from `detection.detection`
and `generate_new_dataset(save_to_csv=True) -> list[dict]` from
`detection.dataset_generator`.

```jsonc
{
  "entities": [
    {
      "entity_id": "ENT-01",
      "risk_score": 55,                    // int, 0-100
      "flags": [
        {
          "flag_id": "FLG-ENT-01-FASTCLOSE",
          "rule_triggered": "critical_closed_too_fast",
          "flag_type": "execution_gap",    // | negative_space | statistical_anomaly
          "severity_of_finding": "high",   // | medium | low
          "reason": "5 critical/high-severity alerts closed well under expected time…",
          "evidence": { "alert_ids": ["AL-79BF7FAA"] }
        }
      ]
    }
  ]
}
```

Two details worth knowing when consuming this:

- **`evidence` keys vary by rule.** Only `critical_closed_too_fast` and
  `duplicate_investigation_notes` carry `alert_ids`; the others carry
  `alert_count`/`peer_average`, `expected_asset`, or
  `anomaly_score`/`most_deviant_feature`/`z_score`. Treat it as an open dict.
- **Open alerts have null `time_closed` and `closure_time_minutes`** (~36% of rows).
  `/api/alerts` coerces those to JSON `null`; detection still receives the raw `NaN`,
  which its pandas logic depends on.

See `guides/` for the full build specs.
