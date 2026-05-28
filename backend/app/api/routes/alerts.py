import uuid
from fastapi import APIRouter, HTTPException
from app.models.alert import PriceAlert, PriceAlertCreate
from app.cache.redis_client import cache_get, cache_set, cache_delete

router = APIRouter()

ALERT_TTL = 60 * 60 * 24 * 30  # 30 days


def _alert_key(alert_id: str) -> str:
    return f"alert:{alert_id}"

def _user_alerts_key(user_id: str) -> str:
    return f"user_alerts:{user_id}"


@router.post("/", response_model=PriceAlert)
async def create_alert(req: PriceAlertCreate, user_id: str = "anon"):
    alert = PriceAlert(
        id=str(uuid.uuid4()),
        user_id=user_id,
        **req.model_dump(),
    )
    await cache_set(_alert_key(alert.id), alert.model_dump(), ALERT_TTL)

    # Track alert ids per user
    existing = await cache_get(_user_alerts_key(user_id)) or []
    existing.append(alert.id)
    await cache_set(_user_alerts_key(user_id), existing, ALERT_TTL)

    return alert


@router.get("/", response_model=list[PriceAlert])
async def list_alerts(user_id: str = "anon"):
    ids = await cache_get(_user_alerts_key(user_id)) or []
    alerts = []
    for aid in ids:
        data = await cache_get(_alert_key(aid))
        if data:
            alerts.append(PriceAlert(**data))
    return alerts


@router.delete("/{alert_id}")
async def delete_alert(alert_id: str, user_id: str = "anon"):
    await cache_delete(_alert_key(alert_id))
    ids = await cache_get(_user_alerts_key(user_id)) or []
    await cache_set(_user_alerts_key(user_id), [i for i in ids if i != alert_id], ALERT_TTL)
    return {"deleted": alert_id}
