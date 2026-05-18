from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

class AppError(Exception):
    def __init__(self, status: int, code: str, message: str, details: dict | None = None):
        self.status = status
        self.code = code
        self.message = message
        self.details = details or {}

def _envelope(req: Request, code: str, message: str, details=None):
    return {
        "error": {
            "code": code,
            "message": message,
            "details": details or {},
            "correlation_id": getattr(req.state, "correlation_id", None),
        }
    }

async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(status_code=exc.status, content=_envelope(request, exc.code, exc.message, exc.details))

async def validation_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=400,
        content=_envelope(request, "VALIDATION_FAILED", "Validation failed", {"errors": exc.errors()}),
    )

async def unhandled_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content=_envelope(request, "INTERNAL_ERROR", str(exc)))
