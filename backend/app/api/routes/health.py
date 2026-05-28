"""
Health & diagnostics endpoint.

GET /health          — basic liveness (used by Render load balancer)
GET /health/detail   — full system check (Google API, Redis, DB)

Render auto-restarts the service if /health returns non-200.
You can set up a free monitor on uptimerobot.com pointing to /health/detail
to get notified by email/SMS if anything breaks — zero maintenance needed.
"""
import os
import time
import asyncio
from fastapi import APIRouter
import structlog

from app.cache.redis_client import cache_get, cache_set
from app.agents.google_search import google_search

log = structlog.get_logger()
router = APIRouter()


async def _check_redis() -> dict:
    try:
        test_key = "_health_ping"
        await cache_set(test_key, {"ok": True}, ttl=60)
        val = await cache_get(test_key)
        return {"status": "ok", "latency_ms": None} if val else {"status": "error", "detail": "write/read mismatch"}
    except Exception as exc:
        return {"status": "error", "detail": str(exc)}


async def _check_google() -> dict:
    key_set = bool(os.getenv("SERPER_API_KEY") or (os.getenv("GOOGLE_API_KEY") and os.getenv("GOOGLE_CSE_ID")))
    if not key_set:
        return {"status": "warning", "detail": "No API key configured — set SERPER_API_KEY in .env"}
    try:
        t = time.time()
        results = await asyncio.wait_for(google_search("test", num=1), timeout=8.0)
        ms = int((time.time() - t) * 1000)
        return {"status": "ok", "latency_ms": ms, "results": len(results)}
    except asyncio.TimeoutError:
        return {"status": "error", "detail": "timeout >8s"}
    except Exception as exc:
        return {"status": "error", "detail": str(exc)}


async def _check_db() -> dict:
    db_url = os.getenv("DATABASE_URL", "")
    if not db_url:
        return {"status": "warning", "detail": "DATABASE_URL not set"}
    try:
        from app.db.database import engine
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        return {"status": "ok"}
    except Exception as exc:
        return {"status": "error", "detail": str(exc)}


@router.get("")
async def health_basic():
    """Basic liveness — always 200 if process is running."""
    return {"status": "ok", "service": "waffir-api", "version": "1.1.0"}


@router.get("/detail")
async def health_detail():
    """
    Full system health check.
    Point your uptime monitor here (uptimerobot.com, betterstack.com, etc.)
    to get notified automatically if something breaks.
    """
    redis_check, google_check, db_check = await asyncio.gather(
        _check_redis(),
        _check_google(),
        _check_db(),
        return_exceptions=False,
    )

    all_ok = all(
        c.get("status") in ("ok", "warning")
        for c in [redis_check, google_check, db_check]
    )

    return {
        "status": "healthy" if all_ok else "degraded",
        "checks": {
            "redis":  redis_check,
            "google": google_check,
            "database": db_check,
        },
        "tips": {
            "google": "Register free at serper.dev → set SERPER_API_KEY",
            "uptime_monitor": "Add /health/detail to uptimerobot.com for free alerts",
        } if not all_ok else {},
    }
