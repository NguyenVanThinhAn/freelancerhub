import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.users import User, UserRole
from app.models.organizations import Organization, VerificationStatus
from app.schemas.organizations import BusinessRegisterIn
from app.core.security import hash_password, validate_password_strength
from app.core.slug import generate_slug
from app.services.email_verification import create_email_verification_token

from app.core.logger import logger


def new_business_user(db: Session, business_data: BusinessRegisterIn):
    """
    Service tạo tài khoản Doanh nghiệp (User + Organization).
    Bọc trong khối try...except với db.rollback() để đảm bảo an toàn giao dịch CSDL tuyệt đối.
    """
    if not validate_password_strength(business_data.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu phải tối thiểu 8 ký tự và chứa cả chữ và số"
        )

    try:
        # 1. Tạo UUID 36 ký tự cho User
        user_id = str(uuid.uuid4())

        # 2. Khởi tạo đối tượng User với MẬT KHẨU ĐÃ ĐƯỢC MÃ HÓA
        db_user = User(
            id=user_id,
            email=business_data.email,
            # Mã hóa mật khẩu an toàn
            password_hash=hash_password(business_data.password),
            timezone=business_data.timezone,
            role=UserRole.enterprise
        )

        # 3. Đưa User vào phiên làm việc (Session)
        db.add(db_user)

        # 4. Sinh slug chuẩn từ tên công ty sử dụng thư viện chuẩn unicodedata
        org_slug = generate_slug(business_data.company_name)

        # 5. Tạo UUID mới cho Doanh nghiệp
        org_id = str(uuid.uuid4())

        # 6. Khởi tạo đối tượng Organization liên kết với user_id vừa tạo làm Owner
        db_org = Organization(
            id=org_id,
            name=business_data.company_name,
            slug=org_slug,
            tax_code=business_data.tax_code,
            website=business_data.website,
            description=business_data.description,
            verification_status=VerificationStatus.unverified,  # Mặc định là chưa xác minh
            owner_user_id=user_id  # Gán User vừa tạo làm Chủ sở hữu
        )

        # 7. Đưa Organization vào phiên làm việc
        db.add(db_org)

        # 8. Chốt (Commit) toàn bộ dữ liệu vào CSDL
        db.commit()

        # 9. Refresh đối tượng từ CSDL để cập nhật thông tin mới nhất
        db.refresh(db_user)
        db.refresh(db_org)

        # 10. Tạo token xác thực email cho user mới
        verification_token = create_email_verification_token(db, db_user)

        # 11. Trả về cặp đôi User, Organization và token xác thực
        return db_user, db_org, verification_token

    except Exception as e:
        # HỦY BỎ TẤT CẢ THAO TÁC NẾU CÓ LỖI XẢY RA (Đảm bảo CSDL không bị treo hoặc rác)
        db.rollback()
        # Ghi log vết lỗi chi tiết kèm stack trace vào logs/app.log để debug
        logger.exception(
            f"DATABASE ERROR in new_business_user (business): {str(e)}")
        # Ném lỗi HTTP 400 hoặc 500 báo về cho client
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi khởi tạo tài khoản Doanh nghiệp: {str(e)}"
        )
