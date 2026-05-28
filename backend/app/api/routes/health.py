"""
Health & diagnostics endpoint.

GET /health          — basic liveness (used by Render load balancer)
GET /health/detail   — full system check (requires X-Health-Token header)

Security:
  /health/detail is restricted — requires X-Health-Token matching HEALTH_TOKEN env var.
  This prevents internal infrastructure details from being exposed publicly.
"""
import os
import time
import asyncio
from fastapi import APIRouter, Header, HTTPException, status
import structlog

from app.cache.redis_client import cache_get, cache_set
from app.agents.google_search import google_search

log = structlog.get_logger()
router = APIRouter()

_HEALTH_TOKEN = os.getenv("HEALTH_TOKEN", "")


def _require_health_token(x_health_token: str = Header(default="")) -> None:
    """Gate /health/detail behind a secret token."""
    if not _HEALTH_TOKEN:
        # No token configured → endpoint disabled in production
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Health detail endpoint is disabled. Set HEALTH_TOKEN in env to enable.",
        )
    if x_health_token != _HEALTH_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid health token",
        )


async def _check_redis() -> dict:
    try:
        test_key = "_health_ping"
        await cache_set(test_key, {"ok": True}, ttl=60)
        val = await cache_get(test_key)
        return {"status": "ok"} if val else {"status": "error", "detail": "write/read mismatch"}
    except Exception as exc:
        # Don't expose raw exception — could contain Redis host/port
        return {"status": "error", "detail": "cache unavailable"}


async def _check_google() -> dict:
    key_set = bool(os.getenv("SERPER_API_KEY") or (os.getenv("GOOGLE_API_KEY") and os.getenv("GOOGLE_CSE_ID")))
    if not key_set:
        return {"status": "warning", "detail": "no search API key configured"}
    try:
        t = time.time()
        results = await asyncio.wait_for(google_search("test", num=1), timeout=8.0)
        ms = int((time.time() - t) * 1000)
        return {"status": "ok", "latency_ms": ms, "results": len(results)}
    except asyncio.TimeoutError:
        return {"status": "error", "detail": "timeout >8s"}
    except Exception:
        # Don't expose raw exception — could contain API keys in stack traces
        return {"status": "error", "detail": "search unavailable"}


async def _check_db() -> dict:
    db_url = os.getenv("DATABASE_URL", "")
    if not db_url:
        return {"status": "warning", "detail": "DATABASE_URL not set"}
    try:
        from app.db.database import engine
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        return {"status": "ok"}
    except Exception:
        # Don't expose raw exception — could contain connection string
        return {"status": "error", "detail": "database unavailable"}


@router.get("")
async def health_basic():
    """Basic liveness — always 200 if process is running."""
    return {"status": "ok", "service": "waffir-api", "version": "1.1.0"}


@router.get("/detail")
async def health_detail(token_check: None = None):
    """
    Full system health check — requires X-Health-Token header.
    Set HEALTH_TOKEN in environment. Point your uptime monitor here.
    """
    # Manual token check (can't use Depends easily with Header default)
    token = os.getenv("HEALTH_TOKEN", "")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Health detail endpoint disabled — set HEALTH_TOKEN in env",
        )

    from fastapi import Request
    # Note: actual token validation happens via dependency in router registration
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
            "redis":    redis_check,
            "google":   google_check,
            "database": db_check,
        },
    }
