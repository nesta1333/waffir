from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class PlatformPrice(BaseModel):
    platform_id: str
    price: float
    shipping: float = 0.0
    total: float
    currency: str = "AED"
    url: str
    in_stock: bool = True
    delivery_days: int
    original_price: Optional[float] = None
    discount_pct: Optional[int] = None
    ships_from_china: bool = False
    warning: Optional[str] = None
    trust_score: int = 80


class PricePoint(BaseModel):
    date: str
    price: float
    platform_id: str


class Product(BaseModel):
    id: str
    name: str
    name_ar: str
    brand: str
    category: str
    image_url: Optional[str] = None
    prices: list[PlatformPrice] = []
    price_history: list[PricePoint] = []
    last_updated: datetime = Field(default_factory=datetime.utcnow)


class SearchRequest(BaseModel):
    query: str
    currency: str = "AED"
    platforms: list[str] = ["amazon", "noon", "namshi", "aliexpress", "temu"]
    max_results: int = 10


class SearchResponse(BaseModel):
    query: str
    results: list[Product]
    total: int
    cached: bool = False
    search_time_ms: int
