# SAT-SA — Supervisory Analytics Tool for SOC Assessment
SIH26157 (NTRO) — Blockchain & Cybersecurity theme

## Structure
- `detection/` — dataset generator + rule engine + ML engine + main entry point
- `backend/` — FastAPI (in progress)
- `frontend/` — React (in progress)

## Run detection standalone
```
pip install -r requirements.txt
python3 -m detection.detection
```
Outputs results to console and `detection/data/sample_output.json`.

## Contract
Backend imports `run_detection(records: list[dict]) -> dict` from `detection.detection`.
See build guides for full schema.
