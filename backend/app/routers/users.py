from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.freelancers import FreelancerInfoIn
from app.schemas.organizations import BusinessRegisterIn
from app.schemas.default import BaseResponse
from app.services.freelancers import new_user
from app.services.organizations import new_business_user

router = APIRouter()


@router.post("/register/freelancer", status_code=status.HTTP_201_CREATED)
def register_freelancer(request: Request, user_data: FreelancerInfoIn, db: Session = Depends(get_db)):
    # Nhận payload từ request, validate bằng schema FreelancerInfoIn

    # Gọi service new_user để xử lý tạo cả User và FrelancerProfile trong DB
    created_user, verification_token = new_user(db, user_data)

    # Sử dụng chuẩn BaseResponse để format kết quả trả về nhất quán toàn hệ thống
    return BaseResponse.create(
        status_code=status.HTTP_201_CREATED,
        message="Tạo tài khoản Freelancer thành công",
        data={"user_id": created_user.id, "email": created_user.email,
              "verification_token": verification_token},
        error=None,
        timestamp=None,  # Tự động lấy datetime.now().isoformat()
        path=request.url.path
    )


@router.post("/register/business", status_code=status.HTTP_201_CREATED)
def register_business(request: Request, business_data: BusinessRegisterIn, db: Session = Depends(get_db)):
    # Nhận payload từ request, validate bằng schema BusinessRegisterIn

    # Gọi service new_business_user để tạo User và Organization tương ứng trong DB
    created_user, created_org, verification_token = new_business_user(
        db, business_data)

    # Sử dụng chuẩn BaseResponse để chuẩn hóa kết quả trả về
    return BaseResponse.create(
        status_code=status.HTTP_201_CREATED,
        message="Tạo tài khoản Doanh nghiệp thành công",
        data={
            "user_id": created_user.id,
            "email": created_user.email,
            "organization": {
                "org_id": created_org.id,
                "name": created_org.name,
                "slug": created_org.slug,
                "verification_status": created_org.verification_status.value
            },
            "verification_token": verification_token
        },
        error=None,
        timestamp=None,
        path=request.url.path
    )
