import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.users import User, UserStatus
from app.models.email_verification_tokens import EmailVerificationToken
from app.core.security import hash_token
from app.core.logger import logger


def _send_email_verification_email(user_email: str, verification_token: str):
    logger.info(
        f"[EMAIL VERIFICATION] gửi token xác thực đến {user_email}: {verification_token}"
    )


def create_email_verification_token(db: Session, user: User):
    if user.status == UserStatus.deleted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản không hợp lệ"
        )

    verification_token = str(uuid.uuid4())
    token_hash_value = hash_token(verification_token)
    try:
        db_token = EmailVerificationToken(
            id=str(uuid.uuid4()),
            user_id=user.id,
            token_hash=token_hash_value,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
        )
        db.add(db_token)
        db.commit()
        _send_email_verification_email(user.email, verification_token)
        return verification_token
    except Exception as e:
        db.rollback()
        logger.exception(
            f"DATABASE ERROR in create_email_verification_token: {str(e)}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Lỗi hệ thống khi tạo token xác thực email"
        )


def verify_email_token(db: Session, token: str):
    token_hash_value = hash_token(token)
    token_record = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token_hash == token_hash_value,
        EmailVerificationToken.revoked == False,
        EmailVerificationToken.used_at == None
    ).first()
    if not token_record or token_record.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token xác thực email không hợp lệ hoặc đã hết hạn"
        )

    user = db.query(User).filter(User.id == token_record.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại"
        )

    if user.status == UserStatus.deleted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản không hợp lệ"
        )

    if user.status == UserStatus.pending_verification:
        user.status = UserStatus.active

    token_record.used_at = datetime.now(timezone.utc)
    token_record.revoked = True
    db.add(user)
    db.add(token_record)
    db.commit()

    return user
