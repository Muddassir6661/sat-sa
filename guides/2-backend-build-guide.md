# SAT-SA — Backend Build Guide (FastAPI)
**Role in project:** Backend — expose the detection system's results to the frontend via API
**Deadline:** Working backend by end of Sept 3, polish Sept 4, present Sept 5

---

## Instructions for the AI reading this file

You are helping build the **backend** for **SAT-SA (Supervisory Analytics Tool for SOC Assessment)** — a hackathon prototype for SIH Problem Statement 26157 (NTRO). This person is on the **free tier**, so be concise — don't over-explain concepts they already understand, and don't produce more code than what's asked for in a given step.

**How to behave:**
- **Ask before assuming.** This person may not know every term used here (SOC, "entity," "flag," "risk score"). If something in this file is unclear to them, explain it plainly before proceeding — don't just barrel ahead assuming they know the domain.
- Before writing any code, confirm with them: do they already have Python + FastAPI set up locally, or do they need setup help first? Don't skip straight to code if the environment isn't ready.
- Build **one endpoint at a time**. Get it working, let them test it, then move to the next. Don't generate the entire backend in one shot unless they explicitly ask for that.
- Stay in scope: **you are building the backend only.** The detection logic (Python functions that actually analyze the data) is being built by a teammate separately — you are NOT writing detection/ML logic, you are calling it and serving it over an API.

---

## Project Context (plain-language, read this first)

**The problem, simply:** A national cybersecurity body (NTRO) manually reviews how well different organizations' security teams (SOCs) are doing their job — are they investigating alerts properly, escalating serious issues, not just closing tickets to look good? Doing this by hand doesn't scale.

**What we're building:** A tool that reads records of how a SOC handled its alerts (metadata like severity, how fast it was closed, whether it was escalated — NOT raw security logs) and automatically flags red flags a human reviewer would catch. Two categories of red flags:
- **Execution gaps** — looks fine on paper, wasn't done properly (e.g., critical alert closed in 2 minutes, no escalation)
- **Negative space** — evidence that's suspiciously missing (e.g., a critical system with zero alerts in months — nobody's watching it)

Your job: **serve this analysis to a website (built by another teammate in React) via an API.**

**Hard constraint:** Everything must run fully offline — no calling external APIs, no cloud services, no internet dependency at runtime.

---

## Tech Stack (already decided by the team — do not change)
- Backend: **FastAPI** (Python)
- Frontend (built separately): **React**
- Detection logic (built separately): plain Python, exposed as one function you call directly

---

## The One Function You Depend On (contract — locked, matches teammate's detection file exactly)

Your teammate is building a Python function called `run_detection()`. You will import and call it directly (not over a network — it's a local Python import, since everything lives in one repo).

```python
def run_detection(records: list[dict]) -> dict:
    """
    Input: list of alert record dicts
    Output:
    {
      "entities": [
        {
          "entity_id": str,
          "risk_score": float,          # 0-100, higher = more concern
          "flags": [
            {
              "flag_id": str,
              "rule_triggered": str,
              "flag_type": str,               # "execution_gap" | "negative_space"
              "severity_of_finding": str,     # "low" | "medium" | "high"
              "reason": str,                   # human-readable explanation
              "evidence": {"alert_ids": [str], "...": "..."}
            }
          ]
        }
      ]
    }
    """
```

**Important:** This function might not be ready yet when you start. Ask the AI to build you a small **mock version** of this function first (returning fake but correctly-shaped data) so you can build and test your API immediately without waiting. Swap in the real function later — the shape won't change.

### Second function you'll use — live dataset generation

```python
def generate_new_dataset(save_to_csv=True) -> list[dict]:
    """
    Generates a fresh randomized SOC alert dataset (different each call),
    saves it to CSV, and returns the records as a list of dicts — ready
    to pass straight into run_detection().
    """
```

This powers a **"Generate New Dataset"** feature — a demo button that creates fresh synthetic data live, showing the system isn't just hardcoded to one fixed file. Both `generate_new_dataset()` and `run_detection()` are already built and working in the `/detection` folder.

---

## Mock Data to Build Against (use this immediately, don't wait for real data)

```json
{
  "entities": [
    {
      "entity_id": "ENT-01",
      "risk_score": 78.5,
      "flags": [
        {
          "flag_id": "FLG-001",
          "rule_triggered": "critical_closed_too_fast",
          "flag_type": "execution_gap",
          "severity_of_finding": "high",
          "reason": "Alert AL-0234 (critical) closed in 3 min, expected >15 min for this severity",
          "evidence": {"alert_ids": ["AL-0234"]}
        }
      ]
    },
    {
      "entity_id": "ENT-02",
      "risk_score": 22.0,
      "flags": []
    }
  ]
}
```

---

## Repo Structure (shared with detection teammate — do not deviate)

```
sat-sa/
├── detection/               ← teammate owns this (dataset + detection logic)
│   └── detection.py          ← exposes run_detection(records) -> dict
├── backend/                  ← YOU own this
│   ├── main.py
│   └── models.py             (Pydantic models matching the contract above)
├── frontend/                 ← other teammate owns this (React)
├── requirements.txt
└── README.md
```

---

## Endpoints to Build (one at a time, in this order)

1. `GET /api/entities` → returns the full `entities` list from `run_detection()` (using mock data first)
2. `GET /api/entities/{entity_id}` → returns one entity's full detail, including all its flags
3. `POST /api/run-detection` → triggers detection on the current dataset and returns fresh results (once the real detection function exists)
4. `POST /api/generate-dataset` → calls `generate_new_dataset()` to create a fresh randomized dataset, then immediately runs `run_detection()` on it and returns the results — this powers the "Generate New Dataset" demo button on the frontend

Keep it simple — no auth needed for a hackathon prototype, no external database required (in-memory or SQLite is enough, ask the AI to pick whichever is faster to set up if unsure).

---

## requirements.txt (shared with detection teammate)

```
fastapi
uvicorn
pandas
numpy
scikit-learn
faker
```

---

## Git Workflow (shared with team)

- One shared GitHub repo, `main` branch
- Small, frequent commits — not one big dump at the end
- You work only inside `/backend` — this minimizes conflicts with your teammates' folders
- If you need something from `/detection` that doesn't exist yet, use the mock data above instead of waiting

---

## Git Cheat Sheet (follow this every session — don't skip)

- **Before you start working each session:** `git pull` — grabs teammates' latest changes first, avoids conflicts
- **After you finish a working chunk (an endpoint that runs, not mid-edit):** 
  ```
  git add .
  git commit -m "short description of what you did"
  git push
  ```
- **If `git push` gets rejected** ("updates were rejected"): someone pushed before you. Run `git pull` first, resolve any conflict if one shows up, then push again.
- **You're working only inside `/backend`**, so conflicts with teammates (who work in `/detection` and `/frontend`) should be rare — but always `pull` before you `push` regardless, it's a 5-second habit that prevents real headaches.
- If this is your first time using git on this machine, set your identity once: `git config --global user.name "Your Name"` and `git config --global user.email "your@email.com"`
- To get the project initially: `git clone <repo-url>` — do this once, then just `pull`/`push` from inside the folder afterward.

---

## Skills/Setup Note for This AI Chat
If this AI assistant supports installable skills or extensions, and one exists for **FastAPI**, **Python API development**, or **REST API scaffolding**, feel free to enable it — it may speed up boilerplate generation. Not required, just helpful if available.

---

## When each endpoint works, say so before moving to the next one — don't let the AI generate the whole backend in one untested block.
