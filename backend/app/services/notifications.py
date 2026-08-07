from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.notifications import Notification, NotificationType
from app.core.logger import logger


def send_notification(db: Session, user_id: str, notification_type: str, title: str, message: str, action_url: str = None):
    try:
        notification = Notification(
            user_id=user_id,
            type=NotificationType(notification_type),
            title=title,
            message=message,
            action_url=action_url
        )
        db.add(notification)
        db.commit()
        return notification
    except Exception as e:
        db.rollback()
        logger.exception(f"DATABASE ERROR in send_notification: {str(e)}")
        raise
