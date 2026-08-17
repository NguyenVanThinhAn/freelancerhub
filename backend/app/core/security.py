import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict
import jwt
import warnings
from passlib.context import CryptContext

JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET or len(JWT_SECRET.encode('utf-8')) < 32:
    raise ValueError(
        "JWT_SECRET env var is required and must be ≥ 32 characters. "
        "Generate one with: export JWT_SECRET=$(openssl rand -hex 32)"
    )
JWT_ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRES_MINUTES = 15
REFRESH_TOKEN_EXPIRES_DAYS = 7

# Prefer stronger KDFs when available, with argon2 first then bcrypt.
# Because bcrypt may require truncation for long passwords, argon2 is preferred when installed.
try:
    import argon2 as _argon2  # type: ignore
    _preferred = ['argon2', 'bcrypt', 'pbkdf2_sha256']
except Exception:
    try:
        import bcrypt as _bcrypt  # type: ignore
        _preferred = ['bcrypt', 'pbkdf2_sha256']
    except Exception:
        _preferred = ['pbkdf2_sha256']

pwd_context = CryptContext(
    schemes=_preferred, 
    deprecated='auto',
    bcrypt__truncate_error=False
)


def validate_password_strength(password: str) -> bool:
    """
    Kiểm tra độ phức tạp mật khẩu: tối thiểu 8 ký tự, phải có cả chữ và số.
    """
    if not password or len(password) < 8:
        return False
    has_letter = any(c.isalpha() for c in password)
    has_digit = any(c.isdigit() for c in password)
    return has_letter and has_digit


def hash_password(password: str) -> str:
    """
    Hàm mã hóa mật khẩu một chiều an toàn bằng `passlib`.
    Ưu tiên dùng `argon2`, nếu không có thì dùng `bcrypt`, rồi mới fallback sang `pbkdf2_sha256`.
    """
    if not password:
        return ""
    # bcrypt chỉ chấp nhận tối đa 72 bytes — truncate thủ công để tránh ValueError
    # trên bcrypt 5.x (passlib 1.7.4 chưa tương thích, ignore `bcrypt__truncate_error`).
    secret = password.encode("utf-8")[:72].decode("utf-8", errors="ignore")
    return pwd_context.hash(secret)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Hàm kiểm tra mật khẩu gõ vào có khớp với mật khẩu đã băm trong CSDL hay không.
    """
    if not plain_password or not hashed_password:
        return False
    try:
        # Khớp với logic truncate phía hash_password
        secret = plain_password.encode("utf-8")[:72].decode("utf-8", errors="ignore")
        return pwd_context.verify(secret, hashed_password)
    except Exception:
        return False


def create_access_token(user_id: str, role: str = "freelancer") -> str:
    expire = datetime.now(timezone.utc) + \
        timedelta(minutes=ACCESS_TOKEN_EXPIRES_MINUTES)
    payload = {
        'sub': user_id,
        'type': 'access',
        'role': role,
        'exp': expire
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str, role: str = "freelancer") -> str:
    expire = datetime.now(timezone.utc) + \
        timedelta(days=REFRESH_TOKEN_EXPIRES_DAYS)
    payload = {
        'sub': user_id,
        'type': 'refresh',
        'role': role,
        'exp': expire
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_jwt_token(token: str) -> Optional[Dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        return None


def hash_token(token: str) -> str:
    return __import__('hashlib').sha256(token.encode('utf-8')).hexdigest()
