from fastapi import APIRouter, Depends, Request, status, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import EmailVerificationRequestIn, EmailVerificationConfirmIn
from app.schemas.default import BaseResponse
from app.core.dependencies import get_current_user
from app.models.users import User
from app.services.email_verification import create_email_verification_token, verify_email_token

router = APIRouter()


@router.post('/auth/email-verification')
def request_email_verification(request: Request, payload: EmailVerificationRequestIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail='Không tìm thấy người dùng')
    token = create_email_verification_token(db, user)
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Tạo token xác thực email thành công',
        data={'verification_token': token},
        error=None,
        timestamp=None,
        path=request.url.path
    )


@router.post('/auth/email-verification/confirm')
def confirm_email_verification(request: Request, payload: EmailVerificationConfirmIn, db: Session = Depends(get_db)):
    user = verify_email_token(db, payload.token)
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Xác thực email thành công',
        data={'user_id': user.id, 'status': user.status.value},
        error=None,
        timestamp=None,
        path=request.url.path
    )
