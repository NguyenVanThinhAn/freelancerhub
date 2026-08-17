import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.users import User, UserRole
from app.models.freelancers import FrelancerProfile
from app.schemas.freelancers import FreelancerInfoIn
from app.core.security import hash_password, validate_password_strength
from app.core.logger import logger
from app.services.email_verification import create_email_verification_token


def new_user(db: Session, user_data: FreelancerInfoIn):
    """
    Service tạo tài khoản Freelancer (User + FreelancerProfile).
    Bọc trong khối try...except với db.rollback() để đảm bảo an toàn giao dịch CSDL tuyệt đối.
    """
    if not validate_password_strength(user_data.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu phải tối thiểu 8 ký tự và chứa cả chữ và số"
        )

    try:
        # 1. Tạo một UUID mới dạng chuỗi (String 36) cho trường users.id
        new_id = str(uuid.uuid4())

        # 2. Khởi tạo đối tượng User với MẬT KHẨU ĐÃ ĐƯỢC MÃ HÓA
        db_user = User(
            id=new_id,
            email=user_data.email,
            # Mã hóa mật khẩu an toàn
            password_hash=hash_password(user_data.password),
            timezone=user_data.timezone,
            role=UserRole.freelancer
        )

        # 3. Thêm user mới vào phiên làm việc
        db.add(db_user)

        # 4. Khởi tạo đối tượng Profile cho freelancer, nối với user vừa tạo
        db_profile = FrelancerProfile(
            user_id=new_id,
            display_name=user_data.display_name
        )

        # 5. Thêm profile vào phiên làm việc
        db.add(db_profile)

        # 6. Chốt (commit) toàn bộ dữ liệu vào Database
        db.commit()

        # 7. Làm mới đối tượng db_user bằng dữ liệu chính thức từ DB
        db_user_refreshed = db.query(User).filter(User.id == new_id).first()

        # 8. Tạo token xác thực email cho user mới
        verification_token = create_email_verification_token(
            db, db_user_refreshed)

        # 9. Trả về user và token xác thực
        return db_user_refreshed, verification_token

    except Exception as e:
        # HỦY BỎ THAO TÁC NẾU CÓ LỖI XẢY RA
        db.rollback()
        # Ghi log vết lỗi chi tiết kèm stack trace vào logs/app.log để debug
        logger.exception(f"DATABASE ERROR in new_user (freelancer): {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi khởi tạo tài khoản Freelancer: {str(e)}"
        )
