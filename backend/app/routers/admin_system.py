from fastapi import APIRouter, Depends, Request, status, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.users import User
from app.models.ai_usage_quotas import AIUsageQuota
from app.schemas.default import BaseResponse

router = APIRouter()


@router.get('/admin/users')
def list_users(request: Request, current_user: User = Depends(require_role('admin')), db: Session = Depends(get_db)):
    users = db.query(User).all()
    data = [{
        'id': user.id,
        'email': user.email,
        'status': user.status.value,
        'role': user.role.value,
        'last_login_at': user.last_login_at.isoformat() if user.last_login_at else None,
        'failed_login_count': user.failed_login_count,
        'locked_until': user.locked_until.isoformat() if user.locked_until else None
    } for user in users]
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Lấy danh sách người dùng thành công',
        data=data,
        error=None,
        timestamp=None,
        path=request.url.path
    )


@router.patch('/admin/users/{user_id}/lock')
def lock_user_account(request: Request, user_id: str, current_user: User = Depends(require_role('admin')), db: Session = Depends(get_db)):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Người dùng không tồn tại')
    if target_user.role.value == 'admin':
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Không thể khóa tài khoản admin')
    from datetime import datetime, timedelta, timezone
    target_user.locked_until = datetime.now(timezone.utc) + timedelta(days=365)
    db.add(target_user)
    db.commit()
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Đã khóa tài khoản người dùng',
        data={'user_id': target_user.id, 'locked_until': target_user.locked_until.isoformat()},
        error=None,
        timestamp=None,
        path=request.url.path
    )


@router.patch('/admin/users/{user_id}/unlock')
def unlock_user_account(request: Request, user_id: str, current_user: User = Depends(require_role('admin')), db: Session = Depends(get_db)):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Người dùng không tồn tại')
    target_user.locked_until = None
    target_user.failed_login_count = 0
    db.add(target_user)
    db.commit()
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Đã mở khóa tài khoản người dùng',
        data={'user_id': target_user.id},
        error=None,
        timestamp=None,
        path=request.url.path
    )


@router.get('/quotas/me')
def get_my_quotas(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    quotas = db.query(AIUsageQuota).filter(
        AIUsageQuota.user_id == current_user.id).all()
    data = [{
        'id': quota.id,
        'feature': quota.feature,
        'limit_count': quota.limit_count,
        'used_count': quota.used_count,
        'reset_date': quota.reset_date.isoformat() if quota.reset_date else None
    } for quota in quotas]
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Lấy hạn mức AI cá nhân thành công',
        data=data,
        error=None,
        timestamp=None,
        path=request.url.path
    )
