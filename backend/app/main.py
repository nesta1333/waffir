import os
import logging
from pathlib import Path
from dotenv import load_dotenv

# Use explicit path so it works regardless of CWD
_env_path = Path(__file__).parent.parent / ".env"
load_dotenv(_env_path, override=True)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from app.api.routes import search, products, alerts, monitor, auth, health, purchases
from app.cache.redis_client import init_redis, close_redis

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Redis ──────────────────────────────────────────────────────────────
    await init_redis()

    # ── PostgreSQL (only if DATABASE_URL is set) ────────────────────────────
    db_url = os.getenv("DATABASE_URL", "")
    if db_url:
        try:
            from app.db.database import create_tables
            await create_tables()
            log.info("PostgreSQL tables ready")
        except Exception as exc:
            log.error("PostgreSQL init failed: %s — running without DB", exc)
    else:
        log.warning("DATABASE_URL not set — auth/persistence features disabled")

    yield
    await close_redis()


app = FastAPI(
    title="Waffir API",
    description="وفّر — Gulf price comparison agent system",
    version="1.1.0",
    lifespan=lifespan,
    # Disable /docs and /redoc in production to avoid exposing API structure
    docs_url="/docs" if os.getenv("ENVIRONMENT", "dev") == "dev" else None,
    redoc_url=None,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
# allow_credentials must NOT be True when allow_origins=["*"].
# Mobile apps use Bearer tokens (not cookies), so credentials=False is correct.
_origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=False,   # Must be False when origins includes "*"
    allow_methods=["GET", "POST", "DELETE", "PUT", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Device-ID", "X-Health-Token"],
)

# ── Request body size limit (64 KB max) ──────────────────────────────────────
_MAX_BODY_SIZE = 64 * 1024  # 64 KB


@app.middleware("http")
async def limit_body_size(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > _MAX_BODY_SIZE:
        return JSONResponse(
            status_code=413,
            content={"detail": "Request body too large — maximum 64 KB"},
        )
    return await call_next(request)


# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(search.router,    prefix="/api/search",    tags=["search"])
app.include_router(products.router,  prefix="/api/products",  tags=["products"])
app.include_router(alerts.router,    prefix="/api/alerts",    tags=["alerts"])
app.include_router(monitor.router,   prefix="/api/monitor",   tags=["monitor"])
app.include_router(auth.router,      prefix="/api/auth",      tags=["auth"])
app.include_router(health.router,    prefix="/health",        tags=["health"])
app.include_router(purchases.router, prefix="/api/purchases", tags=["purchases"])
