"""
Authentication service — phone OTP + JWT.

OTP flow:
  1. POST /api/auth/send-otp   { phone }  → generates 6-digit code, sends SMS
  2. POST /api/auth/verify-otp { phone, code } → returns JWT access token
  3. GET  /api/auth/me         (Bearer token) → returns user profile

SMS providers (set one in .env):
  TWILIO_SID + TWILIO_TOKEN + TWILIO_FROM  → Twilio SMS
  (no provider set)                        → DEV MODE: code printed to logs

JWT:
  SECRET_KEY     — random string, keep secret
  TOKEN_EXPIRE_DAYS — default 30 days
"""
import os
import hmac
import secrets
import logging
from datetime import datetime, timedelta

from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.db.models import User, OtpCode

log = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "")
if not SECRET_KEY:
    # Fail loudly — never run in production without a real key
    import sys
    log.critical("SECRET_KEY is not set! Set it in .env before running.")
    if os.getenv("RENDER") or os.getenv("RAILWAY_ENVIRONMENT"):
        # Hard exit on cloud environments
        sys.exit(1)
    # Dev: use a fixed fallback but warn every startup
    SECRET_KEY = "dev-only-insecure-key-do-not-use-in-production"
    log.warning("Using insecure dev SECRET_KEY — set SECRET_KEY in .env")

ALGORITHM         = "HS256"
TOKEN_EXPIRE_DAYS = int(os.getenv("TOKEN_EXPIRE_DAYS", "30"))
OTP_EXPIRE_MINUTES = 10
MAX_OTP_ATTEMPTS   = 5

TWILIO_SID   = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM  = os.getenv("TWILIO_PHONE_FROM", "")

# Detect production mode (Twilio configured = production)
_IS_PRODUCTION = bool(TWILIO_SID and TWILIO_TOKEN and TWILIO_FROM)


# ── OTP helpers ───────────────────────────────────────────────────────────────
def _generate_otp() -> str:
    """Generate a cryptographically secure 6-digit OTP."""
    return "".join(secrets.choice("0123456789") for _ in range(6))


def _verify_otp_code(stored: str, provided: str) -> bool:
    """Timing-safe OTP comparison — prevents timing attacks."""
    return hmac.compare_digest(stored.encode(), provided.encode())


async def _send_sms(phone: str, code: str) -> None:
    """Send OTP via Twilio if configured, else log for dev."""
    if _IS_PRODUCTION:
        try:
            from twilio.rest import Client  # type: ignore
            client = Client(TWILIO_SID, TWILIO_TOKEN)
            client.messages.create(
                body=f"رمز وفّر الخاص بك: {code}\nلا تشاركه مع أحد.",
                from_=TWILIO_FROM,
                to=phone,
            )
            log.info("SMS sent to %s via Twilio", phone)
        except Exception as exc:
            log.error("Twilio error: %s", exc)
            raise RuntimeError("فشل إرسال الرسالة — حاول مجدداً") from exc
    else:
        # ─── DEV MODE ONLY — never reached in production ─────────────────────
        log.warning("=" * 50)
        log.warning("DEV OTP for %s  →  %s", phone, code)
        log.warning("Set TWILIO_* in .env to enable real SMS")
        log.warning("=" * 50)


# ── Send OTP ──────────────────────────────────────────────────────────────────
async def send_otp(phone: str, db: AsyncSession) -> None:
    """Generate + store + send a fresh OTP for `phone`."""
    # Invalidate any previous unused codes for this phone
    await db.execute(
        update(OtpCode)
        .where(OtpCode.phone == phone, OtpCode.used == False)  # noqa: E712
        .values(used=True)
    )

    code = _generate_otp()
    expires = datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES)

    otp_row = OtpCode(phone=phone, code=code, expires_at=expires)
    db.add(otp_row)
    await db.flush()

    await _send_sms(phone, code)


# ── Verify OTP ─────────────────────────────────────────────────────────────────
async def verify_otp(phone: str, code: str, db: AsyncSession) -> "User":
    """
    Validate code. On success:
      - upsert User row
      - mark OTP used
      - return User object
    Raises ValueError on bad/expired code.
    """
    result = await db.execute(
        select(OtpCode)
        .where(
            OtpCode.phone == phone,
            OtpCode.used == False,  # noqa: E712
            OtpCode.expires_at > datetime.utcnow(),
        )
        .order_by(OtpCode.created_at.desc())
        .limit(1)
    )
    otp_row: OtpCode | None = result.scalar_one_or_none()

    if otp_row is None:
        raise ValueError("انتهت صلاحية الرمز أو غير موجود — اطلب رمزاً جديداً")

    # Increment attempts
    otp_row.attempts += 1
    if otp_row.attempts > MAX_OTP_ATTEMPTS:
        otp_row.used = True
        raise ValueError("تجاوزت الحد الأقصى للمحاولات")

    # Timing-safe comparison
    if not _verify_otp_code(otp_row.code, code):
        raise ValueError("رمز التحقق غير صحيح")

    otp_row.used = True

    # Upsert user
    user_result = await db.execute(select(User).where(User.phone == phone))
    user: User | None = user_result.scalar_one_or_none()

    if user is None:
        user = User(phone=phone)
        db.add(user)
        await db.flush()
    else:
        user.last_seen_at = datetime.utcnow()

    return user


# ── JWT ───────────────────────────────────────────────────────────────────────
def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(days=TOKEN_EXPIRE_DAYS)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> str:
    """Returns user_id (sub) or raises JWTError."""
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    sub = payload.get("sub")
    if not sub:
        raise JWTError("no sub")
    return sub


# ── FastAPI dependency ────────────────────────────────────────────────────────
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(lambda: None),  # overridden in router
) -> User:
    """Strict auth — raises 401 if no valid token."""
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="مطلوب تسجيل الدخول")
    try:
        user_id = decode_token(credentials.credentials)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="رمز غير صالح")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="المستخدم غير موجود")
    return user


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(lambda: None),
) -> User | None:
    """Soft auth — returns None if no token (anonymous use allowed)."""
    if not credentials:
        return None
    try:
        user_id = decode_token(credentials.credentials)
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()
    except Exception:
        return None
