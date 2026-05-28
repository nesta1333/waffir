"""
/api/monitor — lightweight endpoint the mobile app calls to check
whether any stored price alerts have been triggered.

Security:
  - Max 50 alerts per request (prevents resource exhaustion)
  - product_name_ar limited to 500 chars
  - currency validated to known values
  - Rate limiting handled at nginx/Render level; add slowapi here if needed
"""
import unicodedata
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from app.services.price_monitor import check_alerts

router = APIRouter()

_ALLOWED_CURRENCIES = {"AED", "SAR", "KWD", "BHD", "OMR", "QAR"}
_MAX_ALERTS_PER_REQUEST = 50


class AlertCheckItem(BaseModel):
    product_name_ar: str   = Field(..., min_length=1, max_length=500)
    target_price:    float = Field(..., gt=0, le=500_000)
    currency:        str   = Field("AED", max_length=5)

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        v = v.upper().strip()
        if v not in _ALLOWED_CURRENCIES:
            raise ValueError(f"currency must be one of {_ALLOWED_CURRENCIES}")
        return v

    @field_validator("product_name_ar")
    @classmethod
    def normalize_text(cls, v: str) -> str:
        return unicodedata.normalize("NFC", v.strip())


class AlertCheckRequest(BaseModel):
    alerts: list[AlertCheckItem] = Field(..., max_length=_MAX_ALERTS_PER_REQUEST)


class TriggeredAlert(AlertCheckItem):
    current_price: float


class AlertCheckResponse(BaseModel):
    triggered: list[TriggeredAlert]
    checked: int


@router.post("/check", response_model=AlertCheckResponse)
async def check_price_alerts(req: AlertCheckRequest):
    """
    Given a list of alerts (max 50), return those whose current best price ≤ target.
    The mobile app uses this to fire local notifications.
    """
    if not req.alerts:
        return AlertCheckResponse(triggered=[], checked=0)

    raw_alerts = [a.model_dump() for a in req.alerts]
    triggered_raw = await check_alerts(raw_alerts)

    triggered = [TriggeredAlert(**t) for t in triggered_raw]
    return AlertCheckResponse(triggered=triggered, checked=len(req.alerts))
