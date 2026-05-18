import uuid
from datetime import datetime
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from .config import settings
from .db import client, ensure_indexes
from .errors import AppError, app_error_handler, validation_handler, unhandled_handler
from .routers.suppliers import router as suppliers_router

app = FastAPI(
    title="GEP-SCM Supplier Service",
    description="Supplier directory, lifecycle state machine, search, and aggregations.",
    version="1.0.0",
    docs_url="/api/v1/docs",
    redoc_url="/api/v1/redoc",
    openapi_url="/api/v1/openapi.json",
    swagger_ui_parameters={"persistAuthorization": True},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def correlation_mw(request: Request, call_next):
    cid = request.headers.get("x-correlation-id") or f"req_{uuid.uuid4()}"
    request.state.correlation_id = cid
    response = await call_next(request)
    response.headers["X-Correlation-Id"] = cid
    return response

# Render datetimes as ISO with Z suffix
def _default(obj):
    if isinstance(obj, datetime):
        return obj.isoformat().replace("+00:00", "Z")
    raise TypeError

class IsoJSONResponse(JSONResponse):
    def render(self, content) -> bytes:
        import json
        return json.dumps(content, default=_default, separators=(",", ":")).encode("utf-8")

app.router.default_response_class = IsoJSONResponse

app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(RequestValidationError, validation_handler)
app.add_exception_handler(Exception, unhandled_handler)

app.include_router(suppliers_router, prefix="/api/v1")

@app.on_event("startup")
async def on_start():
    await ensure_indexes()
    print("[supplier-service] ready")

@app.get("/health")
async def health():
    try:
        await client().admin.command("ping")
        return {"ok": True}
    except Exception:
        return JSONResponse(status_code=503, content={"ok": False})
