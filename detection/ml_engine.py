"""
SAT-SA — ML anomaly layer (Isolation Forest).

Builds an entity-level feature vector from the raw alert data, runs
Isolation Forest to find entities that behave statistically differently
from their peers, and reports which feature deviated most as a simple,
explainable justification for the flag (z-score based — no SHAP/LIME
needed at this scope).
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

FEATURE_COLUMNS = [
    "avg_closure_time",
    "escalation_rate",
    "alert_volume",
    "duplicate_note_ratio",
    "critical_ratio",
]

FEATURE_LABELS = {
    "avg_closure_time": "average alert closure time",
    "escalation_rate": "escalation rate",
    "alert_volume": "total alert volume",
    "duplicate_note_ratio": "share of duplicate/templated investigation notes",
    "critical_ratio": "share of critical-severity alerts",
}


def build_entity_features(df):
    rows = []
    for entity_id, group in df.groupby("entity_id"):
        closure_times = group["closure_time_minutes"].dropna()
        avg_closure = closure_times.mean() if len(closure_times) else 0

        escalation_rate = group["escalated"].mean()

        volume = len(group)

        notes = group["investigation_notes"]
        if len(notes) > 0:
            top_note_count = notes.value_counts().iloc[0]
            dup_ratio = top_note_count / len(notes)
        else:
            dup_ratio = 0

        critical_ratio = (group["severity"] == "critical").mean()

        rows.append({
            "entity_id": entity_id,
            "avg_closure_time": avg_closure,
            "escalation_rate": escalation_rate,
            "alert_volume": volume,
            "duplicate_note_ratio": dup_ratio,
            "critical_ratio": critical_ratio,
        })
    return pd.DataFrame(rows)


def run_ml_engine(df, contamination=0.2, random_state=42):
    """Returns dict: entity_id -> list of ML-based flags (contract shape)."""
    feat_df = build_entity_features(df)
    X = feat_df[FEATURE_COLUMNS].values

    # standardize manually (z-scores) — used both for the model input
    # consistency and for picking the "most deviant feature" explanation
    means = X.mean(axis=0)
    stds = X.std(axis=0)
    stds[stds == 0] = 1  # avoid divide-by-zero
    X_scaled = (X - means) / stds

    model = IsolationForest(contamination=contamination, random_state=random_state)
    preds = model.fit_predict(X_scaled)  # -1 = anomaly, 1 = normal
    scores = model.decision_function(X_scaled)  # lower = more anomalous

    flags_by_entity = {}
    for i, row in feat_df.iterrows():
        if preds[i] != -1:
            continue
        entity_id = row["entity_id"]
        z_scores = X_scaled[i]
        worst_idx = np.argmax(np.abs(z_scores))
        worst_feature = FEATURE_COLUMNS[worst_idx]
        worst_z = z_scores[worst_idx]
        direction = "higher" if worst_z > 0 else "lower"

        flag = {
            "flag_id": f"FLG-{entity_id}-MLANOMALY",
            "rule_triggered": "isolation_forest_outlier",
            "flag_type": "statistical_anomaly",
            "severity_of_finding": "medium",
            "reason": (
                f"{entity_id} statistically deviates from peer entities — its "
                f"{FEATURE_LABELS[worst_feature]} is notably {direction} than peers "
                f"(z-score {worst_z:.2f}), flagged by anomaly detection across all "
                f"behavioral features combined."
            ),
            "evidence": {
                "anomaly_score": round(float(scores[i]), 3),
                "most_deviant_feature": worst_feature,
                "z_score": round(float(worst_z), 2),
            },
        }
        flags_by_entity.setdefault(entity_id, []).append(flag)

    return flags_by_entity
