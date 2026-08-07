import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.users import User
from app.models.refresh_tokens import RefreshToken
from app.models.password_reset_tokens import PasswordResetToken
from app.core.security import verify_password, hash_password, validate_password_strength, create_access_token, create_refresh_token, hash_token, verify_jwt_token
from app.core.logger import logger


def _send_password_reset_email(user_email: str, reset_token: str):
    """
    Chức năng placeholder gửi email reset password.
    Ở môi trường production, cần tích hợp SMTP/SendGrid/SMTP service.
    """
    logger.info(
        f"[PASSWORD RESET EMAIL] gửi token reset đến {user_email}: {reset_token}"
    )


def _to_utc_aware(dt):
    """Chuẩn hóa datetime từ DB về UTC offset-aware để so sánh an toàn."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def login_user(db: Session, email: str, password: str):
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Thông tin đăng nhập không đúng")

        if user.locked_until and _to_utc_aware(user.locked_until) > datetime.now(timezone.utc):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Tài khoản đang bị khóa tạm thời")

        if not verify_password(password, user.password_hash):
            user.failed_login_count += 1
            if user.failed_login_count >= 5:
                user.locked_until = datetime.now(
                    timezone.utc) + timedelta(minutes=15)
            db.add(user)
            db.commit()
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Thông tin đăng nhập không đúng")

        user.failed_login_count = 0
        user.locked_until = None
        user.last_login_at = datetime.now(timezone.utc)
        db.add(user)
        db.commit()

        access_token = create_access_token(user.id, role=user.role.value)
        refresh_token = create_refresh_token(user.id, role=user.role.value)
        token_hash = hash_token(refresh_token)

        db_refresh = RefreshToken(
            id=str(uuid.uuid4()),
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
        db.add(db_refresh)
        db.commit()

        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'bearer'
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.exception(f"DATABASE ERROR in login_user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Lỗi hệ thống khi đăng nhập")


def refresh_access_token(db: Session, refresh_token: str):
    payload = verify_jwt_token(refresh_token)
    if not payload or payload.get('type') != 'refresh':
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token không hợp lệ")

    user_id = payload.get('sub')
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Refresh token thiếu thông tin")

    token_hash_value = hash_token(refresh_token)
    token_record = db.query(RefreshToken).filter(
        RefreshToken.token_hash == token_hash_value,
        RefreshToken.revoked == False
    ).first()
    if not token_record or _to_utc_aware(token_record.expires_at) < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Refresh token không hợp lệ hoặc đã hết hạn")

    # Revoke old refresh token (rotation)
    token_record.revoked = True
    token_record.used_at = datetime.now(timezone.utc)

    # Issue new tokens
    user = db.query(User).filter(User.id == user_id).first()
    role_value = user.role.value if user else "freelancer"
    new_access_token = create_access_token(user_id, role=role_value)
    new_refresh_token = create_refresh_token(user_id, role=role_value)
    new_token_hash = hash_token(new_refresh_token)
    db.add(RefreshToken(
        id=str(uuid.uuid4()),
        user_id=user_id,
        token_hash=new_token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        created_at=datetime.now(timezone.utc),
        revoked=False,
    ))
    db.commit()

    return {
        'access_token': new_access_token,
        'refresh_token': new_refresh_token,
        'token_type': 'bearer'
    }


def change_password(db: Session, user: User, old_password: str, new_password: str):
    if not verify_password(old_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Mật khẩu cũ không chính xác")

    user.password_hash = hash_password(new_password)
    db.add(user)
    db.commit()
    return user


def create_password_reset_token(db: Session, user: User):
    try:
        reset_token = str(uuid.uuid4())
        token_hash_value = hash_token(reset_token)
        db_token = PasswordResetToken(
            id=str(uuid.uuid4()),
            user_id=user.id,
            token_hash=token_hash_value,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=2)
        )
        db.add(db_token)
        db.commit()
        _send_password_reset_email(user.email, reset_token)
        return reset_token
    except Exception as e:
        db.rollback()
        logger.exception(
            f"DATABASE ERROR in create_password_reset_token: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Lỗi hệ thống khi tạo token đặt lại mật khẩu")


def reset_password(db: Session, token: str, new_password: str):
    token_hash_value = hash_token(token)
    token_record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash_value,
        PasswordResetToken.revoked == False,
        PasswordResetToken.used_at == None
    ).first()
    if not token_record or _to_utc_aware(token_record.expires_at) < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn")

    user = db.query(User).filter(User.id == token_record.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Người dùng không tồn tại")

    user.password_hash = hash_password(new_password)
    token_record.used_at = datetime.now(timezone.utc)
    token_record.revoked = True
    db.add(user)
    db.add(token_record)
    db.commit()
    return user
