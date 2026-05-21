"""Supplier service - OpenTelemetry bootstrap.

Uses only the stable, broadly-compatible import paths. Safe across
opentelemetry-python 1.30+.
"""
from __future__ import annotations

import logging
import os

from opentelemetry import trace, metrics as otel_metrics
from opentelemetry.sdk.resources import Resource

from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Logs API/SDK are still under a leading-underscore module in current releases.
# Wrap each import in its own try so a single missing module degrades gracefully
# rather than crashing the whole service.
_LOGS_AVAILABLE = True
try:
    from opentelemetry._logs import set_logger_provider
    from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
    from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
    from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter
except Exception:  # pragma: no cover - logs are best-effort
    _LOGS_AVAILABLE = False

_INITIALISED = False


def init_telemetry() -> None:
    """Idempotent bootstrap. Call once at process start."""
    global _INITIALISED
    if _INITIALISED:
        return

    service_name    = os.getenv("OTEL_SERVICE_NAME", "gep-supplier")
    service_version = os.getenv("SERVICE_VERSION",   "1.0.0")

    resource = Resource.create({
        "service.name":    service_name,
        "service.version": service_version,
    })

    # ---- Traces ----
    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
    trace.set_tracer_provider(tracer_provider)

    # ---- Metrics ----
    metric_reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(),
        export_interval_millis=10_000,
    )
    meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    otel_metrics.set_meter_provider(meter_provider)

    # ---- Logs ----
    if _LOGS_AVAILABLE:
        logger_provider = LoggerProvider(resource=resource)
        logger_provider.add_log_record_processor(BatchLogRecordProcessor(OTLPLogExporter()))
        set_logger_provider(logger_provider)
        logging.getLogger().addHandler(
            LoggingHandler(level=logging.INFO, logger_provider=logger_provider)
        )

    # ---- Auto-instrumentations (each guarded) ----
    try:
        from opentelemetry.instrumentation.pymongo import PymongoInstrumentor
        PymongoInstrumentor().instrument()
    except Exception as e:
        logging.warning("pymongo instrumentation skipped: %s", e)

    try:
        from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
        HTTPXClientInstrumentor().instrument()
    except Exception as e:
        logging.warning("httpx instrumentation skipped: %s", e)

    try:
        from opentelemetry.instrumentation.logging import LoggingInstrumentor
        LoggingInstrumentor().instrument(set_logging_format=False)
    except Exception as e:
        logging.warning("logging instrumentation skipped: %s", e)

    # System metrics: default configuration is enough for CPU / memory / network / disk.
    try:
        from opentelemetry.instrumentation.system_metrics import SystemMetricsInstrumentor
        SystemMetricsInstrumentor().instrument()
    except Exception as e:
        logging.warning("system_metrics instrumentation skipped: %s", e)

    _INITIALISED = True


def instrument_fastapi(app) -> None:
    """Called once the FastAPI() instance exists."""
    try:
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        FastAPIInstrumentor.instrument_app(app)
    except Exception as e:
        logging.warning("fastapi instrumentation skipped: %s", e)
