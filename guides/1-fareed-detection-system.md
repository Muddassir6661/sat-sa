# SAT-SA — Fareed's Build Guide (Dataset + Detection System)
**Role in project:** Team Lead — dataset design, rule-based detection engine, ML anomaly layer
**Deadline:** Working system by end of Sept 3, polish Sept 4, present Sept 5

---

## Instructions for the AI reading this file

You are helping Fareed build the core data + detection system for **SAT-SA (Supervisory Analytics Tool for SOC Assessment)** — a hackathon prototype for SIH Problem Statement 26157 (NTRO).

**How to behave:**
- Fareed is on the **free tier** — be economical. Don't over-explain things he already knows (he has an ML/cybersecurity background: built an IDS with Random Forest/SVM on CICIDS2017, and a network attack simulator called RedSim). Assume competence in Python, pandas, scikit-learn basics.
- When something is ambiguous or a design decision needs to be made (e.g., how many fake entities, what similarity threshold, what risk-score formula), **ask him directly** rather than silently picking something. One focused question at a time, not a list of 5.
- If he asks for something and you're not sure what he means, ask — don't guess and build the wrong thing, that wastes his limited free-tier messages worse than asking would.
- He prefers **one step at a time** — don't dump the entire dataset generator + rule engine + ML layer in one giant response unless he explicitly asks for all of it at once. Build incrementally, confirm each piece works conceptually, move to the next.
- Do NOT drift into scope he hasn't asked for (e.g., don't start building frontend/backend code — that's someone else's file. Stay in your lane: dataset + detection logic only).
- He is doing supporting research (papers, SOC concepts) separately — you don't need to teach him SOC theory, just help him build.

---

## Project Context (for the AI's understanding)

**What SAT-SA does:** Reads SOC alert/case-management metadata (not raw logs) and flags two categories of problems in how a SOC is doing its job:
- **Execution gaps** — looks fine on paper, isn't in practice (critical alert closed in 2 minutes, no escalation on critical issues, copy-paste investigation notes)
- **Negative space** — evidence that's suspiciously missing (a critical asset with zero alerts in months, an entity with abnormally low alert volume vs. peers)

Output: a ranked list of "entities that need supervisor attention," each with explainable, evidence-backed reasons — never a black-box score.

**Hard constraints (official, scored by judges):**
- Fully offline / air-gapped — no internet dependency, no cloud APIs, no external AI models at runtime
- Every flag must be explainable and traceable back to the record(s) that caused it
- Operates on structured metadata (CSV/JSON), not raw packet captures/logs

**Build order (strict — do not build ML before rules work):**
1. Synthetic dataset
2. Rule-based detection engine (must work end-to-end before touching ML)
3. ML anomaly layer (Isolation Forest) — stretch/depth layer, built only after step 2 is solid

---

## Shared Output Contract (MUST match Mahfooz's backend file exactly — do not change this shape without updating both files)

```python
def run_detection(records: list[dict]) -> dict:
    """
    Input: list of alert record dicts (see schema below)
    Output:
    {
      "entities": [
        {
          "entity_id": str,
          "risk_score": float,          # 0-100, higher = more supervisory concern
          "flags": [
            {
              "flag_id": str,
              "rule_triggered": str,          # e.g. "critical_closed_too_fast"
              "flag_type": str,               # "execution_gap" | "negative_space"
              "severity_of_finding": str,     # "low" | "medium" | "high"
              "reason": str,                   # human-readable, e.g.
                                                # "Alert AL-0234 (critical) closed in 3 min, expected >15 min for this severity"
              "evidence": {
                "alert_ids": [str],
                "...": "any extra supporting fields"
              }
            }
          ]
        }
      ]
    }
    """
```

This is the ONLY function Mahfooz's backend will call from your code. Whatever internal structure you build, expose this function as the single entry point (e.g., in a file called `detection.py` at the repo root or in a `/detection` folder).

---

## Repo Structure (shared — matches Mahfooz's file)

```
sat-sa/
├── detection/              ← YOU own this folder
│   ├── dataset_generator.py
│   ├── data/
│   │   └── synthetic_alerts.csv
│   ├── rules_engine.py
│   ├── ml_engine.py
│   └── detection.py         ← exposes run_detection(records) -> dict (the contract above)
├── backend/                 ← Mahfooz owns this (FastAPI)
├── frontend/                ← Mahfooz owns this (React)
├── requirements.txt          ← shared Python deps (both you and Mahfooz's backend use this)
└── README.md
```

---

## Alert Record Schema (the dataset's shape — locked, do not change without telling Mahfooz)

```
alert_id: str                    # e.g. "AL-00234"
entity_id: str                   # e.g. "ENT-07" (represents a fake Critical Sector Entity)
severity: str                    # "critical" | "high" | "medium" | "low"
category: str                    # e.g. "malware", "unauthorized_access", "data_exfiltration"
disposition: str                 # "closed" | "open" | "escalated"
escalated: bool
time_opened: str (ISO datetime)
time_closed: str (ISO datetime) or null
closure_time_minutes: float or null
investigation_notes: str
asset_id: str
analyst_id: str
```

---

## Step 1 — Dataset Generation (start here)

**Before building this, the AI should ask you (if not already decided):**
1. How many fake entities do you want (10–15 recommended for a believable "peer comparison" effect)?
2. Roughly how many total alert records (500–1000 recommended)?
3. What proportion should be "clean/healthy" vs. deliberately flawed (recommend ~80/20 — most data looks normal, ~20% has injected problems so your detection has something real to catch)?

**What the generator must produce:**
- Majority: realistic, "healthy-looking" records across all entities
- Deliberately injected bad patterns (this becomes your ground truth for testing):
  - Critical/high severity alerts closed in <5 minutes with no escalation
  - Near-identical/templated `investigation_notes` repeated across many alerts (copy-paste pattern)
  - One or two entities with a critical `asset_id` that has zero alerts over the full time window (negative space)
  - One entity with alert volume far below the peer average (negative space)
- Use `faker` for realistic-looking text/IDs if helpful, or plain controlled random generation with `pandas`/`numpy` — either is fine at this scope
- Export to `detection/data/synthetic_alerts.csv`

---

## Second Shared Function — Live Dataset Generation (added after initial build)

The backend has a **"Generate New Dataset"** feature — a demo button that creates a fresh randomized dataset live, rather than always using the same static file. This is already built and working in `dataset_generator.py`:

```python
def generate_new_dataset(save_to_csv=True) -> list[dict]:
    """
    Generates a fresh randomized dataset (no fixed seed — different each call),
    saves it to detection/data/synthetic_alerts.csv, and returns the records
    as a list of dicts, ready to pass straight into run_detection().
    """
```

This is the SECOND function Mahfooz's backend imports directly, alongside `run_detection()`. Typical backend flow for the "Generate New Dataset" button:
```python
records = generate_new_dataset()
result = run_detection(records)
# return result to frontend
```

---

## Step 2 — Rule-Based Detection Engine

Build these rules as independent, testable functions, each returning flags matching the contract's flag shape:

- `check_fast_closure_no_escalation(df)` → critical/high severity + closed under threshold minutes + not escalated
- `check_duplicate_notes(df)` → investigation_notes highly similar across many records (simple `difflib.SequenceMatcher` or basic text hashing is enough — no heavy NLP needed)
- `check_low_alert_volume(df)` → entity's alert count far below peer average over the time window
- `check_missing_critical_telemetry(df)` → a known-critical asset with zero alerts logged

**Ask Fareed before building:** what closure-time threshold (in minutes) counts as "suspiciously fast" for each severity tier, if he has a preference — otherwise propose a reasonable default and confirm.

Combine all rule outputs into entity-level `risk_score` (simple weighted sum of flags is fine — don't overengineer this).

---

## Step 3 — ML Layer (Isolation Forest) — build only after Step 2 works

- Feature-engineer each entity into a vector: avg closure time, escalation rate, alert volume, % duplicate notes, etc.
- Run `sklearn.ensemble.IsolationForest` across entity feature vectors to find outlier entities
- For explainability: report which feature(s) deviated most from the mean/peer group for each flagged entity (simple z-score comparison is sufficient — no need for SHAP/LIME at this scope)
- Merge ML-based flags into the same output contract as rule-based flags (`flag_type` can stay `"execution_gap"` or `"negative_space"` depending on what the anomaly represents, or you can add a `"statistical_anomaly"` type if it doesn't cleanly map — ask Fareed which he prefers when you get here)

Reference for methodology justification (already found, can cite in docs): *"Unsupervised Learning Framework for Cyber Threat Detection, Anomaly Identification, and Alert Prioritization"* — MDPI Applied Sciences, 2026.

---

## requirements.txt (shared with backend)

```
pandas
numpy
scikit-learn
faker
fastapi
uvicorn
```

---

## Git Workflow (shared with Mahfooz)

- One shared repo, `main` branch
- Small, frequent commits — not one giant end-of-day dump
- You work in `/detection`, Mahfooz works in `/backend` and `/frontend` — minimal file overlap by design, so conflicts should be rare
- Pull before you push; if a conflict happens in `detection.py`'s function signature, that's the one file to be careful about since Mahfooz's backend imports it directly

---

## When you're done with each step, tell the AI what's working so it can help you debug or move to the next step — don't wait until everything's built to test.
