"""
Price alert endpoints.

Authentication: anonymous via X-Device-ID header (UUID).
Each device sees only its own alerts — no cross-device access possible.
"""
import uuid
import re
from fastapi import APIRouter, Header, HTTPException, status
from app.models.alert import PriceAlert, PriceAlertCreate
from app.cache.redis_client import cache_get, cache_set, cache_delete

router = APIRouter()

ALERT_TTL = 60 * 60 * 24 * 30  # 30 days

# UUID v4 pattern — validates that device_id is a real UUID, not an arbitrary string
_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


def _validate_device_id(device_id: str) -> str:
    """Validate device_id is a proper UUID v4. Raises 400 if not."""
    if not device_id or not _UUID_RE.match(device_id.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Device-ID header must be a valid UUID v4",
        )
    return device_id.strip().lower()


def _alert_key(alert_id: str) -> str:
    return f"alert:{alert_id}"


def _user_alerts_key(device_id: str) -> str:
    return f"user_alerts:{device_id}"


@router.post("/", response_model=PriceAlert, status_code=status.HTTP_201_CREATED)
async def create_alert(
    req: PriceAlertCreate,
    x_device_id: str = Header(..., description="Anonymous device UUID from AsyncStorage"),
):
    device_id = _validate_device_id(x_device_id)

    alert = PriceAlert(
        id=str(uuid.uuid4()),
        user_id=device_id,
        **req.model_dump(),
    )
    await cache_set(_alert_key(alert.id), alert.model_dump(), ALERT_TTL)

    # Track alert ids per device
    existing = await cache_get(_user_alerts_key(device_id)) or []
    existing.append(alert.id)
    await cache_set(_user_alerts_key(device_id), existing, ALERT_TTL)

    return alert


@router.get("/", response_model=list[PriceAlert])
async def list_alerts(
    x_device_id: str = Header(..., description="Anonymous device UUID from AsyncStorage"),
):
    device_id = _validate_device_id(x_device_id)

    ids = await cache_get(_user_alerts_key(device_id)) or []
    alerts = []
    for aid in ids:
        data = await cache_get(_alert_key(aid))
        if data:
            alerts.append(PriceAlert(**data))
    return alerts


@router.delete("/{alert_id}", status_code=status.HTTP_200_OK)
async def delete_alert(
    alert_id: str,
    x_device_id: str = Header(..., description="Anonymous device UUID from AsyncStorage"),
):
    device_id = _validate_device_id(x_device_id)

    # Verify the alert belongs to this device before deleting
    alert_data = await cache_get(_alert_key(alert_id))
    if alert_data and alert_data.get("user_id") != device_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية حذف هذا التنبيه",
        )

    await cache_delete(_alert_key(alert_id))
    ids = await cache_get(_user_alerts_key(device_id)) or []
    await cache_set(_user_alerts_key(device_id), [i for i in ids if i != alert_id], ALERT_TTL)
    return {"deleted": alert_id}
