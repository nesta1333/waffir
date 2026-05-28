"""
Auth endpoints:

  POST /api/auth/send-otp    { phone: "+971501234567" }
  POST /api/auth/verify-otp  { phone, code }
  GET  /api/auth/me          (Bearer token)
  PUT  /api/auth/me          (Bearer token) { name, language, currency }
  POST /api/auth/sync-alerts (Bearer token) { alerts: [...] }
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError

from app.db.database import get_db
from app.db.models import User, PriceAlert
from app.services.auth_service import (
    send_otp, verify_otp, create_access_token,
    decode_token,
)

router = APIRouter()
_bearer = HTTPBearer(auto_error=False)


# ── Schemas ───────────────────────────────────────────────────────────────────
class SendOtpRequest(BaseModel):
    phone: str   # E.164 format: +971501234567


class VerifyOtpRequest(BaseModel):
    phone: str
    code: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    is_new_user: bool


class UserProfile(BaseModel):
    id: str
    phone: str
    name: Optional[str]
    language: str
    currency: str
    is_premium: bool
    created_at: datetime


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    language: Optional[str] = None
    currency: Optional[str] = None


class AlertSyncItem(BaseModel):
    product_name_ar: str
    product_id: Optional[str] = None
    target_price: float
    currency: str = "AED"
    platform_id: Optional[str] = None


class SyncAlertsRequest(BaseModel):
    alerts: list[AlertSyncItem]


# ── Dependency: get current user from Bearer token ────────────────────────────
async def _current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
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


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.post("/send-otp", status_code=status.HTTP_200_OK)
async def send_otp_endpoint(req: SendOtpRequest, db: AsyncSession = Depends(get_db)):
    """
    Send a 6-digit OTP to the phone number.
    In dev mode (no Twilio config) the code is printed to server logs.
    """
    phone = req.phone.strip()
    if not phone.startswith("+"):
        raise HTTPException(status_code=422, detail="رقم الهاتف يجب أن يبدأ بـ + (مثال: +971501234567)")
    try:
        await send_otp(phone, db)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    return {"message": "تم إرسال رمز التحقق", "phone": phone}


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp_endpoint(req: VerifyOtpRequest, db: AsyncSession = Depends(get_db)):
    """
    Verify OTP → returns JWT access token.
    Creates the user account automatically on first login.
    """
    try:
        user = await verify_otp(req.phone.strip(), req.code.strip(), db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    token = create_access_token(user.id)
    # is_new_user = created very recently (within 5 seconds)
    is_new = (datetime.utcnow() - user.created_at).total_seconds() < 5

    return TokenResponse(
        access_token=token,
        user_id=user.id,
        is_new_user=is_new,
    )


@router.get("/me", response_model=UserProfile)
async def get_me(user: User = Depends(_current_user)):
    """Return the authenticated user's profile."""
    return UserProfile(
        id=user.id,
        phone=user.phone,
        name=user.name,
        language=user.language,
        currency=user.currency,
        is_premium=user.is_premium,
        created_at=user.created_at,
    )


@router.put("/me", response_model=UserProfile)
async def update_me(
    req: UpdateProfileRequest,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update profile fields (name, language, currency)."""
    if req.name is not None:
        user.name = req.name.strip() or None
    if req.language in ("ar", "en"):
        user.language = req.language
    if req.currency in ("AED", "SAR", "KWD", "BHD"):
        user.currency = req.currency
    db.add(user)
    return UserProfile(
        id=user.id, phone=user.phone, name=user.name,
        language=user.language, currency=user.currency,
        is_premium=user.is_premium, created_at=user.created_at,
    )


@router.post("/sync-alerts", status_code=status.HTTP_200_OK)
async def sync_alerts(
    req: SyncAlertsRequest,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Called after login to upload locally-stored alerts to the server.
    Skips duplicates (same product_name_ar + target_price).
    """
    existing_result = await db.execute(
        select(PriceAlert).where(
            PriceAlert.user_id == user.id,
            PriceAlert.is_active == True,  # noqa: E712
        )
    )
    existing = existing_result.scalars().all()
    existing_keys = {(a.product_name_ar, float(a.target_price)) for a in existing}

    added = 0
    for item in req.alerts:
        key = (item.product_name_ar, item.target_price)
        if key not in existing_keys:
            db.add(PriceAlert(
                user_id=user.id,
                product_name_ar=item.product_name_ar,
                product_id=item.product_id,
                target_price=item.target_price,
                currency=item.currency,
                platform_id=item.platform_id,
            ))
            added += 1

    return {"synced": added, "skipped": len(req.alerts) - added}
