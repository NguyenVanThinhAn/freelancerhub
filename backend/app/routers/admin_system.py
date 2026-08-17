from fastapi import APIRouter, Depends, Request, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.users import User
from app.models.ai_usage_quotas import AIUsageQuota
from app.schemas.default import BaseResponse

router = APIRouter()


@router.get('/admin/users')
def list_users(request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_role('admin')), db: Session = Depends(get_db)
):
    query = db.query(User).order_by(User.created_at.desc())
    total = query.count()
    offset = (page - 1) * limit
    users = query.offset(offset).limit(limit).all()
    data = {
        'items': [{
            'id': user.id,
            'email': user.email,
            'status': user.status.value,
            'role': user.role.value,
            'last_login_at': user.last_login_at.isoformat() if user.last_login_at else None,
            'failed_login_count': user.failed_login_count,
            'locked_until': user.locked_until.isoformat() if user.locked_until else None
        } for user in users],
        'total': total,
        'page': page,
        'limit': limit,
    }
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Lấy danh sách người dùng thành công',
        data=data,
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
