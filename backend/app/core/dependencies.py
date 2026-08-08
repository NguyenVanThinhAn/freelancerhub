from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.users import User, UserStatus, UserRole
from app.core.security import verify_jwt_token
from datetime import datetime, timezone

security = HTTPBearer()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    payload = verify_jwt_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Token không hợp lệ hoặc đã hết hạn")

    user_id = payload.get('sub')
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Token không có thông tin user")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Người dùng không tồn tại")

    if user.status not in [UserStatus.active, UserStatus.pending_verification]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Tài khoản không được phép truy cập")

    return user


def require_role(role: str):
    def dependency(current_user=Depends(get_current_user)):
        if current_user.role != UserRole(role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ người dùng có vai trò phù hợp mới được phép truy cập"
            )
        return current_user
    return dependency
