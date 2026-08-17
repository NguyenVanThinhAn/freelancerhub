from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.users import User, UserRole


def get_current_user_optional(
    x_user_id: Optional[str] = Header(None, description="User ID từ JWT token (mock)"),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Dependency lấy user hiện tại (nếu có trong header).
    Trả về None nếu không có x_user_id hoặc user không tồn tại.
    """
    if not x_user_id:
        return None
    return db.query(User).filter(User.id == x_user_id).first()


def admin_required(
    x_user_id: str = Header(..., description="User ID từ JWT token"),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency bảo vệ routes dành riêng cho Admin.
    Theo MASTER-DOC Phần K.13: "Apply least privilege to Admin Portal".

    Cách dùng:
        @router.get("/admin/verifications", dependencies=[Depends(admin_required)])

    Khi có JWT auth thực: thay x_user_id = JWT payload, decode và verify signature.
    """
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Không có thông tin xác thực. Cần JWT token hợp lệ."
        )

    user = db.query(User).filter(User.id == x_user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token xác thực không hợp lệ hoặc đã hết hạn."
        )

    if user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Tài khoản '{user.email}' không có quyền truy cập khu vực Admin. "
                   f"Vai trò hiện tại: '{user.role.value}'. Yêu cầu: 'admin'."
        )

    return user


def freelancer_required(
    x_user_id: str = Header(..., description="User ID từ JWT token"),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency bảo vệ routes dành riêng cho Freelancer.
    """
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Không có thông tin xác thực."
        )

    user = db.query(User).filter(User.id == x_user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token xác thực không hợp lệ."
        )

    if user.role != UserRole.freelancer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Route này chỉ dành cho Freelancer. Vai trò hiện tại: '{user.role.value}'."
        )

    return user
