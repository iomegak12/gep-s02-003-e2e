"""Structured JSON logging for the Supplier service.

LoggingInstrumentor (registered in telemetry.py) injects trace_id/span_id
into every record's `extra` automatically. We additionally render the record
as JSON via python-json-logger so Loki receives stable structured fields.
"""
from __future__ import annotations

import logging
import os
import sys

from pythonjsonlogger import jsonlogger


def configure_logging() -> logging.Logger:
    level = os.getenv("LOG_LEVEL", "INFO").upper()
    fmt = "%(asctime)s %(levelname)s %(name)s %(message)s %(otelTraceID)s %(otelSpanID)s"

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(jsonlogger.JsonFormatter(
        fmt,
        rename_fields={"asctime": "timestamp", "levelname": "level",
                       "otelTraceID": "trace_id", "otelSpanID": "span_id"},
    ))

    root = logging.getLogger()
    root.handlers[:] = [handler]
    root.setLevel(level)

    return logging.getLogger("gep-supplier")


logger = configure_logging()
