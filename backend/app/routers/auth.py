from fastapi import APIRouter, Depends, Request, status, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import LoginIn, RefreshIn, ChangePasswordIn, ResetPasswordRequestIn, ResetPasswordConfirmIn
from app.schemas.default import BaseResponse
from app.services.auth import login_user, refresh_access_token, change_password, create_password_reset_token, reset_password
from app.core.dependencies import get_current_user
from app.models.users import User

router = APIRouter()


@router.post('/auth/login')
def login(request: Request, payload: LoginIn, db: Session = Depends(get_db)):
    tokens = login_user(db, payload.email, payload.password)
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Đăng nhập thành công',
        data=tokens,
        error=None,
        timestamp=None,
        path=request.url.path
    )


@router.post('/auth/refresh')
def refresh(request: Request, payload: RefreshIn, db: Session = Depends(get_db)):
    tokens = refresh_access_token(db, payload.refresh_token)
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Refresh access token thành công',
        data=tokens,
        error=None,
        timestamp=None,
        path=request.url.path
    )


@router.post('/auth/change-password')
def change_password_endpoint(request: Request, payload: ChangePasswordIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    changed_user = change_password(
        db, current_user, payload.old_password, payload.new_password)
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Đổi mật khẩu thành công',
        data={'user_id': changed_user.id},
        error=None,
        timestamp=None,
        path=request.url.path
    )


@router.post('/auth/reset-password')
def reset_password_request(request: Request, payload: ResetPasswordRequestIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail='Không tìm thấy người dùng')
    reset_token = create_password_reset_token(db, user)
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Tạo token đặt lại mật khẩu thành công',
        data={'reset_token': reset_token},
        error=None,
        timestamp=None,
        path=request.url.path
    )


@router.post('/auth/reset-password/confirm')
def reset_password_confirm(request: Request, payload: ResetPasswordConfirmIn, db: Session = Depends(get_db)):
    reset_password(db, payload.token, payload.new_password)
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Đặt lại mật khẩu thành công',
        data=None,
        error=None,
        timestamp=None,
        path=request.url.path
    )
