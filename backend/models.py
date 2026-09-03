"""Pydantic models mirroring the detection contract in detection/detection.py."""

from typing import Any, Dict, List

from pydantic import BaseModel


class Flag(BaseModel):
    flag_id: str
    rule_triggered: str
    # Plain str, not an Enum: the ML layer emits "statistical_anomaly" alongside
    # the rules engine's "execution_gap"/"negative_space", and more may follow.
    flag_type: str
    severity_of_finding: str
    reason: str
    # Keys differ per rule (alert_ids / alert_count+peer_average /
    # expected_asset / anomaly_score+most_deviant_feature+z_score).
    evidence: Dict[str, Any]


class Entity(BaseModel):
    entity_id: str
    # run_detection returns an int; float accepts both without narrowing.
    risk_score: float
    flags: List[Flag]


class DetectionResult(BaseModel):
    entities: List[Entity]


class AlertsResponse(BaseModel):
    # Rows stay untyped dicts rather than a fixed 12-field model: Pydantic drops
    # unknown fields, which would silently hide any column the detection team
    # adds -- the opposite of what a raw-data view is for.
    alerts: List[Dict[str, Any]]
    count: int
