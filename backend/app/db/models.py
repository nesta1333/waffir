"""
SQLAlchemy ORM models — compatible with both SQLite (dev) and PostgreSQL (prod).
UUID columns stored as plain String(36) so SQLite works without extensions.
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, DateTime, Numeric, Integer, ForeignKey, Text,
)
from sqlalchemy.orm import relationship
from app.db.database import Base


def _uuid():
    return str(uuid.uuid4())


# ── Users ─────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id              = Column(String(36), primary_key=True, default=_uuid)
    phone           = Column(String(20), unique=True, nullable=False, index=True)
    name            = Column(String(100), nullable=True)
    language        = Column(String(2),  default="ar", nullable=False)
    currency        = Column(String(3),  default="AED", nullable=False)
    is_premium      = Column(Boolean, default=False, nullable=False)
    premium_expires = Column(DateTime, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_seen_at    = Column(DateTime, default=datetime.utcnow, nullable=False)

    alerts    = relationship("PriceAlert",    back_populates="user", cascade="all, delete-orphan")
    history   = relationship("SearchHistory", back_populates="user", cascade="all, delete-orphan")
    purchases = relationship("Purchase",      back_populates="user", cascade="all, delete-orphan")


# ── OTP Codes ─────────────────────────────────────────────────────────────────
class OtpCode(Base):
    __tablename__ = "otp_codes"

    id         = Column(String(36), primary_key=True, default=_uuid)
    phone      = Column(String(20), nullable=False, index=True)
    code       = Column(String(6),  nullable=False)
    expires_at = Column(DateTime,   nullable=False)
    used       = Column(Boolean,    default=False, nullable=False)
    attempts   = Column(Integer,    default=0, nullable=False)
    created_at = Column(DateTime,   default=datetime.utcnow, nullable=False)


# ── Price Alerts ──────────────────────────────────────────────────────────────
class PriceAlert(Base):
    __tablename__ = "price_alerts"

    id              = Column(String(36), primary_key=True, default=_uuid)
    user_id         = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    product_name_ar = Column(String(500), nullable=False)
    product_id      = Column(String(200), nullable=True)
    target_price    = Column(Numeric(10, 2), nullable=False)
    currency        = Column(String(3),  default="AED", nullable=False)
    platform_id     = Column(String(50), nullable=True)
    is_active       = Column(Boolean,    default=True, nullable=False)
    triggered       = Column(Boolean,    default=False, nullable=False)
    triggered_at    = Column(DateTime,   nullable=True)
    current_price   = Column(Numeric(10, 2), nullable=True)
    created_at      = Column(DateTime,   default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="alerts")


# ── Search History ─────────────────────────────────────────────────────────────
class SearchHistory(Base):
    __tablename__ = "search_history"

    id            = Column(String(36), primary_key=True, default=_uuid)
    user_id       = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    query         = Column(String(500), nullable=False)
    currency      = Column(String(3),   default="AED", nullable=False)
    results_count = Column(Integer,     default=0, nullable=False)
    created_at    = Column(DateTime,    default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="history")


# ── Purchases (self-reported) ─────────────────────────────────────────────────
class Purchase(Base):
    """User manually confirms a purchase — used to calculate savings dashboard."""
    __tablename__ = "purchases"

    id              = Column(String(36), primary_key=True, default=_uuid)
    user_id         = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    device_id       = Column(String(100), nullable=True, index=True)  # anonymous users
    product_name_ar = Column(String(500), nullable=False)
    product_id      = Column(String(200), nullable=True)
    platform_id     = Column(String(50),  nullable=False)
    price_paid      = Column(Numeric(10, 2), nullable=False)
    market_avg      = Column(Numeric(10, 2), nullable=True)   # average price at search time
    best_price      = Column(Numeric(10, 2), nullable=True)   # cheapest found at search time
    currency        = Column(String(3),  default="AED", nullable=False)
    image_url       = Column(String(500), nullable=True)
    saved_amount    = Column(Numeric(10, 2), nullable=True)   # market_avg - price_paid
    created_at      = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="purchases")
