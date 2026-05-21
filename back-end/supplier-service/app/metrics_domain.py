"""Supplier service domain metrics.

  supplier_blacklist_hits_total          - counter
  supplier_crud_total{op,status}         - counter
  supplier_state_transitions_total{from,to,outcome}  - counter
"""
from __future__ import annotations

from opentelemetry import metrics as otel_metrics

_meter = otel_metrics.get_meter("gep-supplier-domain")

blacklist_hits_total = _meter.create_counter(
    name="supplier_blacklist_hits_total",
    description="Number of blacklist check hits (supplier matched blacklist).",
)

crud_total = _meter.create_counter(
    name="supplier_crud_total",
    description="CRUD operation count. Labels op, status.",
)

state_transitions_total = _meter.create_counter(
    name="supplier_state_transitions_total",
    description="Supplier lifecycle state transitions. Labels from, to, outcome.",
)


def record_blacklist_hit(supplier_id: str | None = None) -> None:
    blacklist_hits_total.add(1, {"supplier_id": supplier_id or "unknown"})


def record_crud(op: str, status: str) -> None:
    crud_total.add(1, {"op": op, "status": status})


def record_transition(frm: str, to: str, outcome: str = "ok") -> None:
    state_transitions_total.add(1, {"from": frm, "to": to, "outcome": outcome})
