# SAT-SA — Frontend Build Guide (React)
**Role in project:** Frontend — build the dashboard that displays supervisory findings
**Deadline:** Working dashboard by end of Sept 3, polish Sept 4, present Sept 5

---

## Instructions for the AI reading this file

You are helping build the **frontend dashboard** for **SAT-SA (Supervisory Analytics Tool for SOC Assessment)** — a hackathon prototype for SIH Problem Statement 26157 (NTRO). This person is on the **free tier**, so be concise — don't over-explain, don't generate more than what's asked in a given step.

**How to behave:**
- **Ask before assuming.** If domain terms here (SOC, "entity," "flag," "risk score," "execution gap," "negative space") aren't clear, explain them plainly before proceeding.
- Before writing code, confirm: do they have a React environment set up already (Node, npm, a starter project), or do they need help scaffolding one first?
- **Ask about design preferences before building UI** — don't assume a look. At minimum, ask: what color scheme/mood (serious/corporate vs. modern/clean), and whether they want a specific reference style (e.g., "like a security dashboard," "minimal like Notion," etc.) before generating components.
- Build **one screen/component at a time**. Get it rendering and working with mock data, confirm, then move to the next piece.
- Stay in scope: you are building the **frontend only**. Detection logic and backend API are being built by teammates — you consume their API, you don't build it.

---

## Project Context (plain-language, read this first)

**The problem, simply:** A national cybersecurity body (NTRO) manually reviews how well different organizations' security teams (SOCs) are doing their job. Doing this by hand doesn't scale.

**What we're building:** A tool that reads records of how a SOC handled its alerts and automatically flags red flags a human reviewer would catch:
- **Execution gaps** — looks fine on paper, wasn't done properly (e.g., critical alert closed in 2 minutes, no escalation)
- **Negative space** — evidence that's suspiciously missing (e.g., a critical system with zero alerts in months)

**Your job:** Build the dashboard a human supervisor would actually look at — a ranked list of flagged "entities" (fake organizations in our dataset), with clear, readable reasons for each flag. The whole point of this project is **explainability** — so the UI needs to make "why was this flagged" obvious at a glance, not buried in a tooltip.

**Hard constraint:** Everything must run fully offline / locally — no external APIs, no cloud fonts/assets that require internet at runtime if avoidable (fine to use standard build tooling, just don't wire in live third-party services).

---

## Tech Stack (already decided by the team — do not change)
- Frontend: **React**
- Backend (built separately): **FastAPI**, exposes REST endpoints (below)

---

## Data Shape You'll Be Rendering (contract — locked, matches backend/detection files exactly)

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

**`flag_type` is always either `"execution_gap"` or `"negative_space"`** (may add `"statistical_anomaly"` later — ask if unsure when it comes up).
**`severity_of_finding` is always `"low"`, `"medium"`, or `"high"`.**

Use the JSON above directly as mock data to start building — don't wait on the real backend to exist.

---

## Backend Endpoints You'll Call (once backend teammate has them ready — use mock data until then)

- `GET /api/entities` → list of all entities with risk_score + flags
- `GET /api/entities/{entity_id}` → full detail for one entity
- `POST /api/generate-dataset` → generates a fresh synthetic dataset live and returns new detection results (powers the "Generate New Dataset" button)

---

## Screens to Build (one at a time, in this order)

1. **Dashboard / summary view** — table or card list of all entities, sorted by `risk_score` descending (highest risk = needs attention first). Show entity ID, risk score, and flag count at a glance.
2. **Entity detail view** — click an entity → see every flag with its `reason` text clearly readable, grouped or color-coded by `flag_type` (execution gap vs. negative space) and `severity_of_finding`.
3. **"Generate New Dataset" button** — on the dashboard, a button that calls `POST /api/generate-dataset`, shows a loading state while it runs, then refreshes the dashboard with the new results. This is a demo feature proving the system works on fresh data live, not just one fixed file — good to have ready for the presentation, not just a nice-to-have.
4. *(Optional, if time permits)* Simple chart — e.g., a bar chart of risk scores across entities, to visually show "who needs the most attention."

**Design principle to hold onto throughout:** A judge should be able to look at any flagged entity and immediately understand *why* it was flagged, without digging. Prioritize clarity over decoration.

---

## Repo Structure (shared with backend teammate — do not deviate)

```
sat-sa/
├── detection/               ← other teammate owns this
├── backend/                  ← other teammate owns this (FastAPI)
├── frontend/                 ← YOU own this
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── api/               (functions that call the backend endpoints)
├── requirements.txt
└── README.md
```

---

## Git Workflow (shared with team)

- One shared GitHub repo, `main` branch
- Small, frequent commits — not one big dump at the end
- You work only inside `/frontend` — minimizes conflicts with teammates' folders

---

## Git Cheat Sheet (follow this every session — don't skip)

- **Before you start working each session:** `git pull` — grabs teammates' latest changes first, avoids conflicts
- **After you finish a working chunk (a component that renders, not mid-edit):**
  ```
  git add .
  git commit -m "short description of what you did"
  git push
  ```
- **If `git push` gets rejected** ("updates were rejected"): someone pushed before you. Run `git pull` first, resolve any conflict if one shows up, then push again.
- **You're working only inside `/frontend`**, so conflicts with teammates (who work in `/detection` and `/backend`) should be rare — but always `pull` before you `push` regardless, it's a 5-second habit that prevents real headaches.
- If this is your first time using git on this machine, set your identity once: `git config --global user.name "Your Name"` and `git config --global user.email "your@email.com"`
- To get the project initially: `git clone <repo-url>` — do this once, then just `pull`/`push` from inside the folder afterward.

---

## Skills/Setup Note for This AI Chat
If this AI assistant supports installable skills or extensions, and one exists for **frontend/React development**, **UI component generation**, or **design systems**, enable it if available — it may improve visual quality and speed. Not required, just helpful.

---

## When each screen works with mock data, say so before moving to the next one — don't let the AI generate the whole frontend in one untested block. Once the real backend is ready, swap the mock data calls for real `fetch`/API calls last.
