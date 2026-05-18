from datetime import datetime, timezone
from uuid import uuid4
from typing import Optional
from fastapi import APIRouter, Depends, Query
from ..auth import Principal, require_user, require_roles
from ..db import suppliers
from ..errors import AppError
from ..models import SupplierCreate, SupplierUpdate, ReasonBody
from ..state_machine import assert_transition

router = APIRouter(prefix="/suppliers", tags=["suppliers"])

def _now():
    return datetime.now(timezone.utc)

def _strip_id(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc

async def _get(sid: str) -> dict:
    doc = await suppliers().find_one({"id": sid})
    if not doc:
        raise AppError(404, "SUPPLIER_NOT_FOUND", f"Supplier {sid} not found", {"supplier_id": sid})
    return _strip_id(doc)

@router.post("", status_code=201)
async def create(body: SupplierCreate, principal: Principal = Depends(require_roles("BUYER", "ADMIN"))):
    if await suppliers().find_one({"supplier_code": body.supplier_code}):
        raise AppError(409, "DUPLICATE_RESOURCE", "supplier_code already exists", {"supplier_code": body.supplier_code})
    now = _now()
    doc = {
        **body.model_dump(),
        "id": str(uuid4()),
        "status": "PENDING_APPROVAL",
        "blacklist_reason": None,
        "rating": 0.0,
        "on_time_delivery_rate": 0.0,
        "total_orders_count": 0,
        "total_spend_inr": 0.0,
        "created_by": principal.sub,
        "created_at": now,
        "updated_at": now,
        "deleted_at": None,
    }
    await suppliers().insert_one(doc)
    return _strip_id(doc)

@router.get("")
async def list_suppliers(
    _: Principal = Depends(require_user),
    status: Optional[str] = None,
    category: Optional[str] = None,
    country: Optional[str] = None,
    min_rating: Optional[float] = None,
    tag: Optional[str] = None,
    q: Optional[str] = None,
    sort: str = "-created_at",
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    filt: dict = {"deleted_at": None}
    if status:
        vals = [s.strip() for s in status.split(",")]
        filt["status"] = {"$in": vals} if len(vals) > 1 else vals[0]
    if category: filt["category"] = category
    if country: filt["country"] = country
    if min_rating is not None: filt["rating"] = {"$gte": min_rating}
    if tag: filt["tags"] = tag
    if q: filt["$text"] = {"$search": q}

    sort_spec = []
    for s in sort.split(","):
        s = s.strip()
        if not s: continue
        sort_spec.append((s[1:], -1) if s.startswith("-") else (s, 1))

    total = await suppliers().count_documents(filt)
    cursor = suppliers().find(filt).sort(sort_spec).skip((page - 1) * page_size).limit(page_size)
    data = [_strip_id(d) async for d in cursor]
    return {"data": data, "page": page, "page_size": page_size, "total": total}

@router.get("/search")
async def typeahead(
    q: str,
    limit: int = Query(10, ge=1, le=50),
    _: Principal = Depends(require_user),
):
    cursor = suppliers().find(
        {"$text": {"$search": q}, "deleted_at": None},
        {"id": 1, "display_name": 1, "supplier_code": 1, "category": 1, "status": 1, "_id": 0},
    ).limit(limit)
    return {"data": [d async for d in cursor]}

@router.get("/aggregations/by-category")
async def by_category(_: Principal = Depends(require_user)):
    pipeline = [
        {"$match": {"deleted_at": None}},
        {"$group": {
            "_id": "$category",
            "count": {"$sum": 1},
            "active_count": {"$sum": {"$cond": [{"$eq": ["$status", "ACTIVE"]}, 1, 0]}},
        }},
        {"$project": {"category": "$_id", "count": 1, "active_count": 1, "_id": 0}},
        {"$sort": {"count": -1}},
    ]
    data = [d async for d in suppliers().aggregate(pipeline)]
    return {"data": data, "generated_at": _now()}

@router.get("/aggregations/by-country")
async def by_country(_: Principal = Depends(require_user)):
    pipeline = [
        {"$match": {"deleted_at": None}},
        {"$group": {"_id": "$country", "count": {"$sum": 1}}},
        {"$project": {"country": "$_id", "count": 1, "_id": 0}},
        {"$sort": {"count": -1}},
    ]
    return {"data": [d async for d in suppliers().aggregate(pipeline)], "generated_at": _now()}

@router.get("/aggregations/by-status")
async def by_status(_: Principal = Depends(require_user)):
    pipeline = [
        {"$match": {"deleted_at": None}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        {"$project": {"status": "$_id", "count": 1, "_id": 0}},
    ]
    return {"data": [d async for d in suppliers().aggregate(pipeline)], "generated_at": _now()}

@router.get("/aggregations/top-rated")
async def top_rated(
    limit: int = Query(10, ge=1, le=50),
    min_orders: int = Query(20, ge=0),
    _: Principal = Depends(require_user),
):
    cursor = suppliers().find(
        {"total_orders_count": {"$gte": min_orders}, "deleted_at": None},
        {"_id": 0},
    ).sort([("rating", -1)]).limit(limit)
    return {"data": [d async for d in cursor], "generated_at": _now()}

@router.get("/{sid}")
async def get_one(sid: str, _: Principal = Depends(require_user)):
    return await _get(sid)

@router.get("/{sid}/scorecard")
async def scorecard(sid: str, _: Principal = Depends(require_user)):
    s = await _get(sid)
    return {
        "supplier_id": s["id"],
        "display_name": s["display_name"],
        "rating": s.get("rating", 0.0),
        "on_time_delivery_rate": s.get("on_time_delivery_rate", 0.0),
        "total_orders_count": s.get("total_orders_count", 0),
        "total_spend_inr": s.get("total_spend_inr", 0.0),
        "last_6_months_trend": [],  # populated from PO Service events in production
        "generated_at": _now(),
    }

@router.patch("/{sid}")
async def update(sid: str, body: SupplierUpdate, _: Principal = Depends(require_roles("BUYER", "ADMIN"))):
    await _get(sid)
    patch = {k: v for k, v in body.model_dump(exclude_unset=True).items()}
    if not patch:
        return await _get(sid)
    patch["updated_at"] = _now()
    await suppliers().update_one({"id": sid}, {"$set": patch})
    return await _get(sid)

@router.delete("/{sid}", status_code=204)
async def soft_delete(sid: str, _: Principal = Depends(require_roles("ADMIN"))):
    s = await _get(sid)
    await suppliers().update_one(
        {"id": sid},
        {"$set": {"status": "INACTIVE", "deleted_at": _now(), "updated_at": _now()}},
    )

async def _transition(sid: str, target: str, extra: dict | None = None):
    s = await _get(sid)
    assert_transition(s["status"], target)
    patch = {"status": target, "updated_at": _now(), **(extra or {})}
    await suppliers().update_one({"id": sid}, {"$set": patch})
    return await _get(sid)

@router.post("/{sid}/approve")
async def approve(sid: str, _: Principal = Depends(require_roles("ADMIN"))):
    return await _transition(sid, "ACTIVE")

@router.post("/{sid}/deactivate")
async def deactivate(sid: str, body: ReasonBody, _: Principal = Depends(require_roles("ADMIN"))):
    return await _transition(sid, "INACTIVE", {"deactivation_reason": body.reason})

@router.post("/{sid}/reactivate")
async def reactivate(sid: str, _: Principal = Depends(require_roles("ADMIN"))):
    return await _transition(sid, "ACTIVE")

@router.post("/{sid}/blacklist")
async def blacklist(sid: str, body: ReasonBody, _: Principal = Depends(require_roles("ADMIN"))):
    return await _transition(sid, "BLACKLISTED", {"blacklist_reason": body.reason})
