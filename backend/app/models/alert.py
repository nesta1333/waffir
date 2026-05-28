from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class PriceAlertCreate(BaseModel):
    product_id: str
    product_name_ar: str
    target_price: float
    currency: str = "AED"
    platform_id: Optional[str] = None  # None = any platform


class PriceAlert(PriceAlertCreate):
    id: str
    user_id: str
    is_active: bool = True
    triggered: bool = False
    created_at: datetime = datetime.utcnow()
    triggered_at: Optional[datetime] = None
