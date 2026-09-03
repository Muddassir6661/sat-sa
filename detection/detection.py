"""
SAT-SA — main detection entry point.

This is the ONLY function the backend imports and calls. Combines the
rule-based engine and the ML anomaly layer into entity-level risk scores
and flags, matching the shared output contract exactly.
"""

import pandas as pd

from detection.rules_engine import run_rules_engine
from detection.ml_engine import run_ml_engine

# Weights for computing risk_score from flag severities
SEVERITY_WEIGHTS = {"high": 35, "medium": 20, "low": 10}
MAX_RISK_SCORE = 100


def _compute_risk_score(flags):
    score = sum(SEVERITY_WEIGHTS.get(f["severity_of_finding"], 10) for f in flags)
    return min(score, MAX_RISK_SCORE)


def run_detection(records: list[dict]) -> dict:
    """
    Input: list of alert record dicts (see schema in build guide)
    Output: {"entities": [{"entity_id", "risk_score", "flags": [...]}]}
    """
    df = pd.DataFrame(records)
    if df.empty:
        return {"entities": []}

    # closure_time_minutes and escalated need correct dtypes if coming from JSON
    if "closure_time_minutes" in df.columns:
        df["closure_time_minutes"] = pd.to_numeric(df["closure_time_minutes"], errors="coerce")
    if "escalated" in df.columns:
        df["escalated"] = df["escalated"].astype(bool)

    rule_flags = run_rules_engine(df)
    ml_flags = run_ml_engine(df)

    all_entity_ids = sorted(df["entity_id"].unique())
    entities = []
    for entity_id in all_entity_ids:
        flags = rule_flags.get(entity_id, []) + ml_flags.get(entity_id, [])
        entities.append({
            "entity_id": entity_id,
            "risk_score": _compute_risk_score(flags),
            "flags": flags,
        })

    entities.sort(key=lambda e: e["risk_score"], reverse=True)
    return {"entities": entities}


if __name__ == "__main__":
    import json

    df = pd.read_csv("detection/data/synthetic_alerts.csv")
    records = df.to_dict(orient="records")
    result = run_detection(records)

    print(f"\n{'='*70}\nSAT-SA Detection Results — {len(result['entities'])} entities\n{'='*70}")
    for entity in result["entities"]:
        print(f"\n{entity['entity_id']}  |  risk_score: {entity['risk_score']}")
        if not entity["flags"]:
            print("  (no flags)")
        for flag in entity["flags"]:
            print(f"  [{flag['flag_type']} / {flag['severity_of_finding']}] {flag['rule_triggered']}")
            print(f"    -> {flag['reason']}")

    with open("detection/data/sample_output.json", "w") as f:
        json.dump(result, f, indent=2)
    print(f"\nFull output written to detection/data/sample_output.json")
