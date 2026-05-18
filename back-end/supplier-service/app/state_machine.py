from .errors import AppError

# (from, to) -> required role
TRANSITIONS = {
    ("PENDING_APPROVAL", "ACTIVE"): "ADMIN",
    ("PENDING_APPROVAL", "BLACKLISTED"): "ADMIN",
    ("ACTIVE", "INACTIVE"): "ADMIN",
    ("ACTIVE", "BLACKLISTED"): "ADMIN",
    ("INACTIVE", "ACTIVE"): "ADMIN",
    ("INACTIVE", "BLACKLISTED"): "ADMIN",
}

def assert_transition(current: str, target: str):
    if (current, target) not in TRANSITIONS:
        raise AppError(
            409, "INVALID_STATUS_TRANSITION",
            f"Cannot transition from {current} to {target}",
            {"from": current, "to": target},
        )
