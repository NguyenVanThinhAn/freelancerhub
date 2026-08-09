from fastapi import APIRouter, Depends, Request, status, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.default import BaseResponse
from app.core.dependencies import get_current_user
from app.models.chat_threads import ChatThread
from app.models.chat_messages import ChatMessage
from app.models.thread_participants import ThreadParticipant
from app.models.notifications import Notification
from app.models.users import User
from app.services.contact_info_monitor import process_and_log_exchanges
from app.services.notifications import send_notification

router = APIRouter()


@router.get('/notifications')
def list_notifications(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(Notification).filter(Notification.user_id ==
                                          current_user.id).order_by(Notification.created_at.desc()).all()
    return BaseResponse.create(status_code=status.HTTP_200_OK, message='Lấy danh sách thông báo thành công', data=[{
        'id': n.id,
        'type': n.type.value,
        'title': n.title,
        'message': n.message,
        'is_read': n.is_read,
        'action_url': n.action_url,
        'created_at': n.created_at.isoformat()
    } for n in items], error=None, timestamp=None, path=request.url.path)


@router.patch('/notifications/{notification_id}/read')
def mark_notification_read(request: Request, notification_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notification = db.query(Notification).filter(
        Notification.id == notification_id, Notification.user_id == current_user.id).first()
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail='Không tìm thấy thông báo')
    notification.is_read = True
    db.add(notification)
    db.commit()
    return BaseResponse.create(status_code=status.HTTP_200_OK, message='Đã đánh dấu thông báo đã đọc', data=None, error=None, timestamp=None, path=request.url.path)


@router.post('/chat/threads')
def create_chat_thread(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    thread = ChatThread()
    db.add(thread)
    db.commit()
    participant = ThreadParticipant(
        thread_id=thread.id, user_id=current_user.id)
    db.add(participant)
    db.commit()
    return BaseResponse.create(status_code=status.HTTP_201_CREATED, message='Tạo luồng chat thành công', data={'thread_id': thread.id}, error=None, timestamp=None, path=request.url.path)


@router.get('/chat/threads/{thread_id}/messages')
def list_chat_messages(request: Request, thread_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    thread = db.query(ChatThread).filter(ChatThread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail='Không tìm thấy luồng chat')
    messages = db.query(ChatMessage).filter(
        ChatMessage.thread_id == thread_id).order_by(ChatMessage.created_at.asc()).all()
    return BaseResponse.create(status_code=status.HTTP_200_OK, message='Lấy danh sách tin nhắn thành công', data=[{
        'id': m.id,
        'sender_id': m.sender_id,
        'content_text': m.content_text,
        'created_at': m.created_at.isoformat()
    } for m in messages], error=None, timestamp=None, path=request.url.path)


@router.post('/chat/threads/{thread_id}/messages')
def send_chat_message(request: Request, thread_id: str, content: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    thread = db.query(ChatThread).filter(ChatThread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail='Không tìm thấy luồng chat')
    message_text = content.get('content_text')
    if not message_text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail='Nội dung tin nhắn không được để trống')
    message = ChatMessage(thread_id=thread_id,
                          sender_id=current_user.id, content_text=message_text)
    db.add(message)
    db.commit()
    db.refresh(message)

    # Monitor: phát hiện email/phone/social links
    process_and_log_exchanges(
        db, thread_id, current_user.id, message.id, message_text
    )

    send_notification(db, current_user.id, 'MESSAGE_RECEIVED',
                      'Bạn có tin nhắn mới', 'Bạn có tin nhắn mới trong cuộc trò chuyện')
    return BaseResponse.create(status_code=status.HTTP_201_CREATED, message='Gửi tin nhắn thành công', data={'message_id': message.id}, error=None, timestamp=None, path=request.url.path)
