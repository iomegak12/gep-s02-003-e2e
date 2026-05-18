from fastapi import Depends, Header
from jose import jwt, JWTError
from .config import settings
from .errors import AppError

class Principal:
    def __init__(self, sub: str, email: str, name: str, roles: list[str], approval_limit):
        self.sub = sub
        self.email = email
        self.name = name
        self.roles = roles
        self.approval_limit = approval_limit

def _verify(token: str) -> Principal:
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=["HS256"],
            issuer=settings.JWT_ISSUER, audience=settings.JWT_AUDIENCE,
        )
    except JWTError as e:
        raise AppError(401, "TOKEN_INVALID", str(e))
    return Principal(
        sub=payload["sub"],
        email=payload.get("email", ""),
        name=payload.get("name", ""),
        roles=payload.get("roles", []),
        approval_limit=payload.get("approval_limit"),
    )

def require_user(authorization: str | None = Header(None)) -> Principal:
    if not authorization or not authorization.startswith("Bearer "):
        raise AppError(401, "AUTH_REQUIRED", "Missing bearer token")
    return _verify(authorization[7:])

def require_roles(*roles: str):
    def dep(p: Principal = Depends(require_user)) -> Principal:
        if not any(r in p.roles for r in roles):
            raise AppError(403, "INSUFFICIENT_ROLE", f"Requires one of: {', '.join(roles)}")
        return p
    return dep
