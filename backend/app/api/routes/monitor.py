"""
/api/monitor — lightweight endpoint the mobile app calls to check
whether any stored price alerts have been triggered.

The mobile app is the source of truth for which alerts exist
(stored locally in AsyncStorage). This endpoint just does the price
lookup and returns the triggered subset — no server-side persistence.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.price_monitor import check_alerts

router = APIRouter()


class AlertCheckItem(BaseModel):
    product_name_ar: str
    target_price: float
    currency: str = "AED"


class AlertCheckRequest(BaseModel):
    alerts: list[AlertCheckItem]


class TriggeredAlert(AlertCheckItem):
    current_price: float


class AlertCheckResponse(BaseModel):
    triggered: list[TriggeredAlert]
    checked: int


@router.post("/check", response_model=AlertCheckResponse)
async def check_price_alerts(req: AlertCheckRequest):
    """
    Given a list of alerts, return those whose current best price ≤ target.
    The mobile app uses this to fire local notifications.
    """
    raw_alerts = [a.model_dump() for a in req.alerts]
    triggered_raw = await check_alerts(raw_alerts)

    triggered = [TriggeredAlert(**t) for t in triggered_raw]
    return AlertCheckResponse(triggered=triggered, checked=len(req.alerts))
