import unicodedata
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional

_ALLOWED_CURRENCIES = {"AED", "SAR", "KWD", "BHD", "OMR", "QAR"}


class PriceAlertCreate(BaseModel):
    product_id:      str   = Field(..., min_length=1, max_length=100)
    product_name_ar: str   = Field(..., min_length=1, max_length=500)
    target_price:    float = Field(..., gt=0, le=500_000)
    currency:        str   = Field("AED", max_length=5)
    platform_id:     Optional[str] = Field(None, max_length=50)

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


class PriceAlert(PriceAlertCreate):
    id:           str
    user_id:      str
    is_active:    bool = True
    triggered:    bool = False
    created_at:   datetime = Field(default_factory=datetime.utcnow)
    triggered_at: Optional[datetime] = None
