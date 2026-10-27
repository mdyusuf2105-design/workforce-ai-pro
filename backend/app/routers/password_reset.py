import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.password_reset_token import PasswordResetToken
from app.schemas.password_reset import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
)
from app.core.security import hash_password


router = APIRouter(prefix="/api/auth", tags=["Password Recovery"])


def hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse,
)
def forgot_password(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    email = str(data.email).lower()

    # Always return the same public message to avoid revealing accounts.
    response = ForgotPasswordResponse(
        message=(
            "If an active account exists for this email, "
            "a password reset can be initiated."
        )
    )

    user = (
        db.query(User)
        .filter(User.email == email, User.is_active.is_(True))
        .first()
    )

    if user is None:
        return response

    # Invalidate previous unused tokens for this user.
    existing_tokens = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
        )
        .all()
    )

    now = datetime.now(timezone.utc)

    for existing in existing_tokens:
        existing.used_at = now

    raw_token = secrets.token_urlsafe(32)

    reset_record = PasswordResetToken(
        user_id=user.id,
        token_hash=hash_reset_token(raw_token),
        expires_at=now + timedelta(minutes=15),
    )

    db.add(reset_record)
    db.commit()

    # Development/testing only. Remove this field when email delivery is enabled.
    response.reset_token = raw_token
    return response


@router.post(
    "/reset-password",
    response_model=ResetPasswordResponse,
)
def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    token_digest = hash_reset_token(data.token)

    reset_record = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == token_digest)
        .first()
    )

    now = datetime.now(timezone.utc)

    if reset_record is None or reset_record.used_at is not None:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired password reset token",
        )

    expires_at = reset_record.expires_at

    # Handle database drivers that return naive datetimes.
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at <= now:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired password reset token",
        )

    user = db.get(User, reset_record.user_id)

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired password reset token",
        )

    user.hashed_password = hash_password(data.new_password)
    reset_record.used_at = now

    db.commit()

    return {
        "message": (
            "Password reset successfully. Please log in with your new password."
        )
    }
