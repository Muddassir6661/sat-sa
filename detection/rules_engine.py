"""
SAT-SA — Rule-based detection engine.

Each check function scans the alert dataframe and returns a list of flag
dicts matching the shared contract. Deterministic, fast, fully explainable
— these are the "known bad pattern" checks.
"""

from difflib import SequenceMatcher

import pandas as pd

EXPECTED_MIN_CLOSURE = {"critical": 15, "high": 20, "medium": 30, "low": 10}
FAST_CLOSURE_THRESHOLD_RATIO = 0.35  # flag if closure time is under 35% of expected minimum


def _new_flag(flag_id, rule, flag_type, severity, reason, evidence):
    return {
        "flag_id": flag_id,
        "rule_triggered": rule,
        "flag_type": flag_type,
        "severity_of_finding": severity,
        "reason": reason,
        "evidence": evidence,
    }


def check_fast_closure_no_escalation(df):
    """Critical/high alerts closed suspiciously fast without escalation."""
    flags = []
    subset = df[
        df["severity"].isin(["critical", "high"])
        & df["closure_time_minutes"].notna()
        & (~df["escalated"])
    ]
    for entity_id, group in subset.groupby("entity_id"):
        bad_alerts = []
        for _, row in group.iterrows():
            threshold = EXPECTED_MIN_CLOSURE[row["severity"]] * FAST_CLOSURE_THRESHOLD_RATIO
            if row["closure_time_minutes"] < threshold:
                bad_alerts.append(row)
        if len(bad_alerts) >= 2:  # require a pattern, not a one-off
            alert_ids = [r["alert_id"] for r in bad_alerts]
            flags.append(_new_flag(
                f"FLG-{entity_id}-FASTCLOSE",
                "critical_closed_too_fast",
                "execution_gap",
                "high",
                f"{len(bad_alerts)} critical/high-severity alerts closed well under expected "
                f"time with no escalation (e.g. {alert_ids[0]} closed in "
                f"{bad_alerts[0]['closure_time_minutes']} min).",
                {"alert_ids": alert_ids},
            ))
    return flags


def check_duplicate_notes(df):
    """Near-identical investigation notes repeated across many alerts."""
    flags = []
    for entity_id, group in df.groupby("entity_id"):
        notes = group["investigation_notes"].tolist()
        alert_ids = group["alert_id"].tolist()
        if len(notes) < 5:
            continue
        # cheap duplicate detection: count notes that are exact or near-exact matches
        from collections import Counter
        counts = Counter(notes)
        most_common_note, count = counts.most_common(1)[0]
        ratio = count / len(notes)
        if ratio >= 0.25 and count >= 5:
            dup_ids = [aid for aid, n in zip(alert_ids, notes) if n == most_common_note]
            flags.append(_new_flag(
                f"FLG-{entity_id}-DUPNOTES",
                "duplicate_investigation_notes",
                "execution_gap",
                "medium",
                f"{count} of {len(notes)} alerts ({ratio:.0%}) share near-identical "
                f"investigation notes ('{most_common_note}'), suggesting template-driven, "
                f"superficial review rather than genuine investigation.",
                {"alert_ids": dup_ids[:10]},
            ))
    return flags


def check_low_alert_volume(df):
    """Entity with alert volume far below the peer average."""
    flags = []
    counts = df.groupby("entity_id").size()
    mean_count = counts.mean()
    for entity_id, count in counts.items():
        if count < mean_count * 0.35:
            flags.append(_new_flag(
                f"FLG-{entity_id}-LOWVOL",
                "low_alert_volume_vs_peers",
                "negative_space",
                "high",
                f"{entity_id} logged only {count} alerts vs. a peer average of "
                f"{mean_count:.0f} — unexpectedly low activity may indicate a monitoring "
                f"blind spot rather than genuinely low risk.",
                {"alert_count": int(count), "peer_average": round(mean_count, 1)},
            ))
    return flags


def check_missing_critical_telemetry(df):
    """Entities where the expected 'core' critical asset shows zero alerts."""
    flags = []
    all_entities = df["entity_id"].unique()
    for entity_id in all_entities:
        expected_asset = f"AST-{entity_id}-CORE"
        entity_assets = df[df["entity_id"] == entity_id]["asset_id"].unique()
        if expected_asset not in entity_assets:
            flags.append(_new_flag(
                f"FLG-{entity_id}-MISSINGTELEM",
                "missing_critical_asset_telemetry",
                "negative_space",
                "high",
                f"No alerts recorded for {entity_id}'s core critical asset "
                f"({expected_asset}) across the full reporting period — expected "
                f"regular telemetry from this asset class is absent.",
                {"expected_asset": expected_asset},
            ))
    return flags


def run_rules_engine(df):
    """Run all rule checks and group flags by entity_id."""
    all_flags = (
        check_fast_closure_no_escalation(df)
        + check_duplicate_notes(df)
        + check_low_alert_volume(df)
        + check_missing_critical_telemetry(df)
    )
    by_entity = {}
    for flag in all_flags:
        # entity_id is embedded in flag_id prefix "FLG-<entity>-..."
        entity_id = flag["flag_id"].split("-")[1] + "-" + flag["flag_id"].split("-")[2]
        by_entity.setdefault(entity_id, []).append(flag)
    return by_entity
