# SAT-SA — Upload Dataset Feature Guide
**Adds to your existing backend + frontend work — same repo, same contract, same conventions.**
**Read this alongside files #2, #3, and #6 — this is a new, small feature, not a restart.**

---

## Instructions for the AI reading this file

Same rules as before: this person is on a time crunch (presentation is tomorrow) and free tier where applicable — be efficient, build in small verified steps, don't over-explain things already covered in the earlier guides. If using Claude Code, verify each piece actually runs before moving to the next (see file #6 for that workflow).

---

## What this feature does

Right now the system only works on the dataset that already lives in `detection/data/synthetic_alerts.csv`, or a freshly *generated* synthetic one via the existing "Generate New Dataset" button. This feature adds a third way to get data in: **a judge (or you) can upload their own CSV file**, and the system runs the exact same detection pipeline on it — same rule engine, same ML layer, same explainability, same dashboard.

This is good for the demo because it proves the system isn't hardcoded to one fixed file — it genuinely processes arbitrary structured data matching the schema.

---

## The contract stays exactly the same

You're not adding new detection logic. You're adding a new **entry point** into logic that already exists. The uploaded file just needs to be parsed into the same shape `run_detection()` already expects:

```python
run_detection(records: list[dict]) -> dict
```

Where each record matches the existing alert schema:
```
alert_id, entity_id, severity, category, disposition, escalated,
time_opened, time_closed, closure_time_minutes, investigation_notes,
asset_id, analyst_id
```

---

## Backend — one new endpoint

`POST /api/upload-dataset`

- Accepts a CSV file upload (`multipart/form-data`, standard file upload in FastAPI — use `UploadFile`)
- Parses it into a pandas DataFrame, same way `detection.py` already does when reading the CSV internally
- Converts to `list[dict]` via `.to_dict(orient="records")` — same pattern already used in `detection/detection.py`'s `__main__` block
- Calls `run_detection(records)` on it
- Returns the result in the exact same shape as `/api/run-detection` and `/api/generate-dataset` already do — **frontend should be able to reuse the same result-handling code for all three**, no special-casing needed

**Validation to include (keep it simple, not exhaustive):**
- If required columns are missing, return a clear error message listing which columns are missing — don't let it crash with a raw pandas/Python traceback
- If the file isn't valid CSV at all, catch that and return a clean error too
- No need to validate every field's data type exhaustively — this is a hackathon prototype, not production-hardened software; basic "does it have the right columns and parse as CSV" is enough

---

## Frontend — one new UI element

Add an **"Upload Dataset"** button/file input near the existing "Generate New Dataset" button (same area of the dashboard, so it reads as one family of "ways to load data" rather than a bolted-on afterthought).

- Standard file input, accept `.csv` only
- On upload, `POST` to `/api/upload-dataset` as `multipart/form-data`
- Show a loading state while it processes (same pattern you already used for "Generate New Dataset")
- On success, refresh the dashboard with the new results — reuse whatever result-rendering logic already exists for the other two data-loading paths
- On error (bad file), show the error message returned by the backend clearly — don't just fail silently

---

## Where to test this

A quick way to test without needing a "wrong" file on hand: export the existing `synthetic_alerts.csv` from the dataset tab (you already built CSV export for findings — same idea), then re-upload that exact file and confirm it produces the same detection results. That proves the round-trip works before testing with anything edited/different.

---

## Git workflow — same as before

```
git pull
# build + verify
git add .
git commit -m "Add dataset upload endpoint and UI"
git push
```

---

## Scope reminder
This is a small, contained addition — one backend endpoint, one frontend control, no new detection logic, no schema changes. Don't let it balloon into a bigger feature (e.g., don't build JSON upload too unless there's time left over — CSV only is enough to prove the point for tomorrow).
