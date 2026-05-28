"""
Purchases endpoint — self-reported purchases from the app.
User confirms "I bought this" → we record it and calculate savings.

POST /api/purchases       — record a purchase
GET  /api/purchases/stats — aggregated savings stats (by device_id)

Security:
  - device_id must be a valid UUID v4 (same pattern as alerts)
  - user_id is never accepted from the client body
  - image_url validated against known CDN allowlist
  - price fields capped to prevent spoofed savings
"""
import re
import unicodedata
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import Purchase

router = APIRouter()

# UUID v4 pattern — shared with alerts.py
_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)

# Allowed image URL domains — only trusted e-commerce CDNs
_ALLOWED_IMAGE_DOMAINS = (
    "images-na.ssl-images-amazon.com",
    "m.media-amazon.com",
    "images.amazon.ae",
    "f.nooncdn.com",
    "k.nooncdn.com",
    "cdn.namshi.com",
    "img.temu.com",
    "ae01.alicdn.com",
    "ae04.alicdn.com",
)

_ALLOWED_CURRENCIES = {"AED", "SAR", "KWD", "BHD", "OMR", "QAR"}
_MAX_PRICE = 500_000.0   # upper bound for Gulf market prices


def _validate_device_id(device_id: str) -> str:
    if not device_id or not _UUID_RE.match(device_id.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Device-ID header must be a valid UUID v4",
        )
    return device_id.strip().lower()


def _validate_image_url(url: Optional[str]) -> Optional[str]:
    """Accept only URLs from known e-commerce CDNs."""
    if not url:
        return None
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        if parsed.scheme not in ("https", "http"):
            return None
        host = parsed.netloc.lower().lstrip("www.")
        for allowed in _ALLOWED_IMAGE_DOMAINS:
            if host == allowed or host.endswith("." + allowed):
                return url
    except Exception:
        pass
    return None   # Silently drop invalid URLs (don't expose validation details)


# ── Schemas ───────────────────────────────────────────────────────────────────
class PurchaseIn(BaseModel):
    product_name_ar: str    = Field(..., min_length=1, max_length=500)
    product_id:      Optional[str] = Field(None, max_length=100)
    platform_id:     str    = Field(..., max_length=50)
    price_paid:      float  = Field(..., gt=0, le=_MAX_PRICE)
    market_avg:      Optional[float] = Field(None, gt=0, le=_MAX_PRICE)
    best_price:      Optional[float] = Field(None, gt=0, le=_MAX_PRICE)
    currency:        str    = Field("AED", max_length=5)
    image_url:       Optional[str] = Field(None, max_length=512)

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

    @field_validator("platform_id")
    @classmethod
    def validate_platform(cls, v: str) -> str:
        allowed = {"amazon", "noon", "namshi", "aliexpress", "temu"}
        v = v.lower().strip()
        if v not in allowed:
            raise ValueError(f"platform_id must be one of {allowed}")
        return v

    @model_validator(mode="after")
    def validate_price_logic(self) -> "PurchaseIn":
        # market_avg must be >= price_paid for there to be real savings
        if self.market_avg and self.price_paid and self.market_avg < self.price_paid * 0.5:
            # Implausible: market avg less than 50% of price paid → cap savings
            self.market_avg = self.price_paid
        return self


class PurchaseOut(BaseModel):
    id:           str
    saved_amount: Optional[float]
    message_ar:   str


class StatsOut(BaseModel):
    total_saved:      float
    purchase_count:   int
    this_month_saved: float
    avg_saving_pct:   float
    best_deal:        Optional[dict] = None


# ── Record purchase ───────────────────────────────────────────────────────────
@router.post("/", response_model=PurchaseOut)
async def record_purchase(
    data: PurchaseIn,
    db: AsyncSession = Depends(get_db),
    x_device_id: str = Header(..., description="Anonymous device UUID"),
):
    device_id = _validate_device_id(x_device_id)

    saved = None
    if data.market_avg and data.market_avg > data.price_paid:
        saved = round(data.market_avg - data.price_paid, 2)

    # Never accept user_id from client — it is derived server-side only
    purchase = Purchase(
        user_id=None,        # set later if user logs in and we sync
        device_id=device_id,
        product_name_ar=data.product_name_ar,
        product_id=data.product_id,
        platform_id=data.platform_id,
        price_paid=data.price_paid,
        market_avg=data.market_avg,
        best_price=data.best_price,
        currency=data.currency,
        image_url=_validate_image_url(data.image_url),
        saved_amount=saved,
    )
    db.add(purchase)
    await db.flush()

    if saved and saved > 0:
        msg = f"ممتاز! وفّرت {saved:.0f} {data.currency} مقارنةً بمتوسط السوق 🎉"
    else:
        msg = "تم تسجيل مشترياتك. استمر في المقارنة لتوفير أكثر!"

    return PurchaseOut(id=purchase.id, saved_amount=saved, message_ar=msg)


# ── Stats ─────────────────────────────────────────────────────────────────────
@router.get("/stats", response_model=StatsOut)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    x_device_id: str = Header(..., description="Anonymous device UUID"),
):
    """Returns savings stats for the requesting device only."""
    device_id = _validate_device_id(x_device_id)

    result = await db.execute(
        select(Purchase).where(Purchase.device_id == device_id)
    )
    purchases = result.scalars().all()

    if not purchases:
        return StatsOut(
            total_saved=0, purchase_count=0,
            this_month_saved=0, avg_saving_pct=0,
        )

    total_saved = sum(float(p.saved_amount or 0) for p in purchases)
    count = len(purchases)

    now = datetime.utcnow()
    this_month = sum(
        float(p.saved_amount or 0)
        for p in purchases
        if p.created_at.year == now.year and p.created_at.month == now.month
    )

    pcts = [
        float(p.saved_amount) / float(p.market_avg) * 100
        for p in purchases
        if p.market_avg and float(p.market_avg) > 0 and p.saved_amount
    ]
    avg_pct = round(sum(pcts) / len(pcts), 1) if pcts else 0.0

    best = max(purchases, key=lambda p: float(p.saved_amount or 0))
    best_deal = None
    if best and best.saved_amount:
        best_deal = {
            "product_name_ar": best.product_name_ar,
            "saved_amount":    float(best.saved_amount),
            "platform_id":     best.platform_id,
            "currency":        best.currency,
            "created_at":      best.created_at.isoformat(),
            # image_url deliberately excluded from stats response
        }

    return StatsOut(
        total_saved=round(total_saved, 2),
        purchase_count=count,
        this_month_saved=round(this_month, 2),
        avg_saving_pct=avg_pct,
        best_deal=best_deal,
    )
