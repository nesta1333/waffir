"""
Cache layer — Redis if available, otherwise in-memory dict (dev mode).
Set REDIS_URL=redis://... in .env to use Redis.
Leave it empty or unset to use the built-in memory cache (no install needed).
"""
import hashlib
import json
import os
import time
import unicodedata
from typing import Any, Optional

CACHE_TTL = 60 * 30  # 30 minutes

# ── In-memory fallback ────────────────────────────────────────────────────────
_memory_store: dict[str, tuple[Any, float]] = {}  # key → (value, expires_at)

_redis = None


async def init_redis() -> None:
    global _redis
    url = os.getenv("REDIS_URL", "").strip()
    if not url:
        _redis = None
        return
    try:
        import redis.asyncio as aioredis
        _redis = await aioredis.from_url(url, encoding="utf-8", decode_responses=True)
        await _redis.ping()
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("Redis unavailable (%s) — using memory cache", exc)
        _redis = None


async def close_redis() -> None:
    if _redis:
        await _redis.aclose()


async def cache_get(key: str) -> Optional[Any]:
    if _redis:
        raw = await _redis.get(key)
        return json.loads(raw) if raw else None
    # memory fallback
    entry = _memory_store.get(key)
    if entry and entry[1] > time.time():
        return entry[0]
    _memory_store.pop(key, None)
    return None


async def cache_set(key: str, value: Any, ttl: int = CACHE_TTL) -> None:
    if _redis:
        await _redis.setex(key, ttl, json.dumps(value, default=str))
        return
    _memory_store[key] = (value, time.time() + ttl)


async def cache_delete(key: str) -> None:
    if _redis:
        await _redis.delete(key)
        return
    _memory_store.pop(key, None)


def search_cache_key(query: str, currency: str) -> str:
    """
    Build a safe Redis cache key from a user query.

    - Applies NFC Unicode normalization (prevents Arabic homoglyph cache bypass)
    - Hashes the query so arbitrary user input never becomes part of the key
      (prevents key-space collision with alert:, user_alerts:, product: namespaces)
    """
    normalized = unicodedata.normalize("NFC", query.strip().lower())
    query_hash = hashlib.sha256(normalized.encode()).hexdigest()[:32]
    currency_safe = currency.upper().strip()[:5]
    return f"search:{query_hash}:{currency_safe}"


def product_cache_key(product_id: str) -> str:
    return f"product:{product_id}"
