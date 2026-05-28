"""
Purchases endpoint — self-reported purchases from the app.
User confirms "I bought this" → we record it and calculate savings.

POST /api/purchases       — record a purchase
GET  /api/purchases/stats — aggregated savings stats (by device_id or user)
"""
from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import Purchase

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────
class PurchaseIn(BaseModel):
    device_id:       str            # anonymous device fingerprint (from Expo)
    product_name_ar: str
    product_id:      Optional[str] = None
    platform_id:     str
    price_paid:      float
    market_avg:      Optional[float] = None
    best_price:      Optional[float] = None
    currency:        str = "AED"
    image_url:       Optional[str] = None
    user_id:         Optional[str] = None  # set if logged in


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
async def record_purchase(data: PurchaseIn, db: AsyncSession = Depends(get_db)):
    saved = None
    if data.market_avg and data.market_avg > data.price_paid:
        saved = round(data.market_avg - data.price_paid, 2)

    purchase = Purchase(
        user_id=data.user_id,
        device_id=data.device_id,
        product_name_ar=data.product_name_ar,
        product_id=data.product_id,
        platform_id=data.platform_id,
        price_paid=data.price_paid,
        market_avg=data.market_avg,
        best_price=data.best_price,
        currency=data.currency,
        image_url=data.image_url,
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
async def get_stats(device_id: str, db: AsyncSession = Depends(get_db)):
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

    # Average saving % = avg of (saved/market_avg) where market_avg > 0
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
            "image_url":       best.image_url,
        }

    return StatsOut(
        total_saved=round(total_saved, 2),
        purchase_count=count,
        this_month_saved=round(this_month, 2),
        avg_saving_pct=avg_pct,
        best_deal=best_deal,
    )
