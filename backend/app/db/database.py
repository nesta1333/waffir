"""
Async SQLAlchemy engine + session factory.
Dev:  DATABASE_URL=sqlite+aiosqlite:///./waffir.db   (default — no install needed)
Prod: DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/waffir
"""
import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

_RAW = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./waffir.db").strip()

# Render/Heroku supply postgres:// — fix for asyncpg
if _RAW.startswith("postgres://"):
    _RAW = _RAW.replace("postgres://", "postgresql+asyncpg://", 1)

DATABASE_URL = _RAW
_is_sqlite = DATABASE_URL.startswith("sqlite")

# SQLite doesn't support pool_size / max_overflow
_engine_kwargs: dict = {"echo": False}
if not _is_sqlite:
    _engine_kwargs.update(pool_pre_ping=True, pool_size=5, max_overflow=10)

engine = create_async_engine(DATABASE_URL, **_engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def create_tables():
    from app.db import models  # noqa: F401
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
