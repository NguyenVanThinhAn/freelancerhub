from datetime import datetime
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.default import BaseResponse
from app.core.dependencies import get_current_user, require_admin
from app.models.users import User
from app.models.contact_info_exchanges import ContactInfoExchange, ExchangeStatus


router = APIRouter(prefix="/admin", tags=["Admin Contact Monitor"])


@router.get('/contact-exchanges')
def list_contact_exchanges(
    request: Request,
    status: str = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(ContactInfoExchange)

    if status:
        query = query.filter(ContactInfoExchange.status == status)

    total = query.count()
    items = query.order_by(ContactInfoExchange.created_at.desc()).offset(skip).limit(limit).all()

    return BaseResponse.create(
        status_code=200, message='OK', data={
            'total': total,
            'items': [
                {
                    'id': e.id,
                    'thread_id': e.thread_id,
                    'sender_id': e.sender_id,
                    'pattern_type': e.pattern_type.value,
                    'raw_content': e.raw_content,
                    'status': e.status.value,
                    'bypass_reason': e.bypass_reason,
                    'created_at': e.created_at.isoformat(),
                }
                for e in items
            ]
        }, error=None, timestamp=None, path=request.url.path
    )


@router.patch('/contact-exchanges/{exchange_id}/bypass')
def bypass_contact_exchange(
    request: Request,
    exchange_id: str,
    reason: str = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    exchange = db.query(ContactInfoExchange).filter(
        ContactInfoExchange.id == exchange_id
    ).first()
    if not exchange:
        raise HTTPException(status_code=404, detail='Không tìm thấy bản ghi')

    exchange.status = ExchangeStatus.APPROVED
    exchange.reviewed_by = current_user.id
    exchange.reviewed_at = datetime.utcnow()
    exchange.bypass_reason = reason

    db.add(exchange)
    db.commit()

    return BaseResponse.create(
        status_code=200, message='Đã duyệt bypass', data=None,
        error=None, timestamp=None, path=request.url.path
    )


@router.patch('/contact-exchanges/{exchange_id}/flag')
def flag_contact_exchange(
    request: Request,
    exchange_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    exchange = db.query(ContactInfoExchange).filter(
        ContactInfoExchange.id == exchange_id
    ).first()
    if not exchange:
        raise HTTPException(status_code=404, detail='Không tìm thấy bản ghi')

    exchange.status = ExchangeStatus.FLAGGED
    exchange.reviewed_by = current_user.id
    exchange.reviewed_at = datetime.utcnow()

    db.add(exchange)
    db.commit()

    return BaseResponse.create(
        status_code=200, message='Đã gắn cờ vi phạm', data=None,
        error=None, timestamp=None, path=request.url.path
    )
