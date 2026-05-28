from fastapi import APIRouter, HTTPException
from app.models.product import Product
from app.cache.redis_client import cache_get, product_cache_key

router = APIRouter()


@router.get("/{product_id}", response_model=Product)
async def get_product(product_id: str):
    cached = await cache_get(product_cache_key(product_id))
    if not cached:
        raise HTTPException(404, "Product not found or cache expired")
    return Product(**cached)
