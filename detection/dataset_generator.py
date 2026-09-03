"""
SAT-SA — Synthetic SOC alert/case-management dataset generator.

Produces a realistic-looking dataset of SOC alert records across fake
"Critical Sector Entities" (ENT-01 ... ENT-N), with ~80% healthy/normal
records and ~20% deliberately flawed records representing known
execution-gap and negative-space patterns. This gives the detection
engine real signal to catch, and gives us ground truth to validate against.
"""

import random
import uuid
from datetime import datetime, timedelta

import pandas as pd
from faker import Faker

fake = Faker()
random.seed(42)
Faker.seed(42)

NUM_ENTITIES = 12
NUM_RECORDS = 800
CLEAN_RATIO = 0.80  # 80% healthy, 20% flawed

SEVERITIES = ["critical", "high", "medium", "low"]
SEVERITY_WEIGHTS = [0.10, 0.25, 0.40, 0.25]
CATEGORIES = [
    "malware", "unauthorized_access", "data_exfiltration",
    "phishing", "dos_attempt", "policy_violation", "insider_threat",
]
DISPOSITIONS = ["closed", "escalated", "open"]

# Expected minimum closure time (minutes) by severity, for a "properly
# investigated" alert. Used both to generate healthy data and later as
# reference for the rules engine.
EXPECTED_MIN_CLOSURE = {"critical": 15, "high": 20, "medium": 30, "low": 10}

TEMPLATE_NOTES = [
    "Reviewed alert. No further action required.",
    "Investigated and closed. False positive.",
    "Checked logs, closing as non-issue.",
]

ENTITIES = [f"ENT-{i:02d}" for i in range(1, NUM_ENTITIES + 1)]

# A subset of entities get a "critical asset" that should generate regular
# alerts. We'll use this to inject negative-space (missing telemetry) cases.
CRITICAL_ASSETS = {ent: f"AST-{ent}-CORE" for ent in ENTITIES}

# Pick entities to receive injected problems (won't touch all of them —
# some entities should come out completely clean, for contrast)
FLAWED_ENTITIES = random.sample(ENTITIES, k=5)
LOW_VOLUME_ENTITY = FLAWED_ENTITIES[0]
MISSING_TELEMETRY_ENTITY = FLAWED_ENTITIES[1]
FAST_CLOSURE_ENTITIES = FLAWED_ENTITIES[2:4]
TEMPLATE_NOTES_ENTITY = FLAWED_ENTITIES[4]

START_DATE = datetime(2026, 1, 1)
END_DATE = datetime(2026, 6, 30)


def random_datetime(start=START_DATE, end=END_DATE):
    delta = end - start
    return start + timedelta(seconds=random.randint(0, int(delta.total_seconds())))


def make_record(entity_id, force_fast_closure=False, force_template_notes=False):
    severity = random.choices(SEVERITIES, weights=SEVERITY_WEIGHTS)[0]
    time_opened = random_datetime()
    escalated = random.random() < (0.6 if severity in ("critical", "high") else 0.15)
    disposition = "escalated" if escalated else random.choice(["closed", "open"])

    if disposition != "open":
        min_expected = EXPECTED_MIN_CLOSURE[severity]
        if force_fast_closure and severity in ("critical", "high"):
            closure_minutes = round(random.uniform(0.5, min_expected * 0.3), 1)
            escalated = False  # the flaw: fast closure AND no escalation
            disposition = "closed"
        else:
            closure_minutes = round(random.uniform(min_expected, min_expected * 6), 1)
        time_closed = time_opened + timedelta(minutes=closure_minutes)
    else:
        closure_minutes = None
        time_closed = None

    if force_template_notes:
        notes = random.choice(TEMPLATE_NOTES)
    else:
        notes = fake.sentence(nb_words=12)

    asset_id = CRITICAL_ASSETS[entity_id] if random.random() < 0.15 else f"AST-{entity_id}-{random.randint(1,20):02d}"

    return {
        "alert_id": f"AL-{uuid.uuid4().hex[:8].upper()}",
        "entity_id": entity_id,
        "severity": severity,
        "category": random.choice(CATEGORIES),
        "disposition": disposition,
        "escalated": escalated,
        "time_opened": time_opened.isoformat(),
        "time_closed": time_closed.isoformat() if time_closed else None,
        "closure_time_minutes": closure_minutes,
        "investigation_notes": notes,
        "asset_id": asset_id,
        "analyst_id": f"ANL-{random.randint(1, 25):03d}",
    }


def generate_dataset():
    records = []

    # Base volume per entity — LOW_VOLUME_ENTITY gets far fewer records
    base_per_entity = NUM_RECORDS // NUM_ENTITIES
    for entity in ENTITIES:
        if entity == LOW_VOLUME_ENTITY:
            n = max(3, base_per_entity // 5)  # suspiciously low volume
        else:
            n = base_per_entity

        for _ in range(n):
            force_fast = entity in FAST_CLOSURE_ENTITIES and random.random() < 0.35
            force_template = entity == TEMPLATE_NOTES_ENTITY and random.random() < 0.5
            records.append(make_record(entity, force_fast, force_template))

    # MISSING_TELEMETRY_ENTITY: remove any records that used its critical asset,
    # simulating a critical system that generates zero alerts (negative space)
    critical_asset = CRITICAL_ASSETS[MISSING_TELEMETRY_ENTITY]
    records = [
        r for r in records
        if not (r["entity_id"] == MISSING_TELEMETRY_ENTITY and r["asset_id"] == critical_asset)
    ]

    random.shuffle(records)
    df = pd.DataFrame(records)
    return df


def generate_new_dataset(save_to_csv=True) -> list[dict]:
    """
    Shared contract function — called by the backend's 'Generate New Dataset'
    feature. Generates a fresh randomized dataset each call (no fixed seed),
    optionally saves it to the standard CSV path, and returns the records
    as a list of dicts ready to pass into run_detection().
    """
    random.seed()  # unseed for true randomness on each live-generated run
    df = generate_dataset()
    if save_to_csv:
        df.to_csv("detection/data/synthetic_alerts.csv", index=False)
    return df.to_dict(orient="records")


if __name__ == "__main__":
    df = generate_dataset()
    out_path = "detection/data/synthetic_alerts.csv"
    df.to_csv(out_path, index=False)
    print(f"Generated {len(df)} records across {NUM_ENTITIES} entities -> {out_path}")
    print(f"Injected flaws in: {FLAWED_ENTITIES}")
    print(f"  Low volume: {LOW_VOLUME_ENTITY}")
    print(f"  Missing telemetry: {MISSING_TELEMETRY_ENTITY}")
    print(f"  Fast closure / no escalation: {FAST_CLOSURE_ENTITIES}")
    print(f"  Template notes: {TEMPLATE_NOTES_ENTITY}")
