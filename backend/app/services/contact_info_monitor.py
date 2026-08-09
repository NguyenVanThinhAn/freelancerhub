import re
from app.models.contact_info_exchanges import (
    ContactInfoExchange, ContactPattern, ExchangeStatus
)
from app.models.notifications import Notification
from app.models.users import User


# Các regex patterns dùng chung, compile 1 lần
_PATTERNS = {
    ContactPattern.EMAIL: re.compile(
        r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}',
        re.IGNORECASE
    ),
    ContactPattern.PHONE_VN: re.compile(
        r'(?<!\d)(0\d{9,10})(?!\d)'   # 09xxxxxxxx, 0xxxxxxxxx
    ),
    ContactPattern.PHONE_INTL: re.compile(
        r'(?<!\d)(\+84\d{9,10})(?!\d)'   # +849xxxxxxxx
    ),
    ContactPattern.SOCIAL_LINK: re.compile(
        r'(?:facebook\.com|fb\.com|zalo\.me|t\.me|telegram\.me)/[\w\.]+',
        re.IGNORECASE
    ),
}


def scan_contact_info(raw_text: str) -> list[dict]:
    """
    Scan text thuần, trả danh sách pattern phát hiện được.

    Returns:
        [{"type": ContactPattern, "value": "matched string"}, ...]
    """
    results = []
    seen = set()

    for ptype, regex in _PATTERNS.items():
        for match in regex.finditer(raw_text):
            val = match.group()
            if val not in seen:
                seen.add(val)
                results.append({"type": ptype, "value": val})

    return results


def process_and_log_exchanges(
    db,
    thread_id: str,
    sender_id: str,
    message_id: str,
    raw_content: str,
) -> list[ContactInfoExchange]:
    """
    Sau khi chat message được lưu → gọi hàm này để:
    1. Scan nội dung
    2. Tạo ContactInfoExchange record cho mỗi pattern
    3. Notify admin nếu có phát hiện

    Returns:
        List các ContactInfoExchange đã tạo
    """
    found = scan_contact_info(raw_content)
    if not found:
        return []

    exchanges = []
    for item in found:
        exchange = ContactInfoExchange(
            thread_id=thread_id,
            sender_id=sender_id,
            message_id=message_id,
            pattern_type=item["type"],
            raw_content=item["value"],
            status=ExchangeStatus.PENDING,
        )
        db.add(exchange)
        exchanges.append(exchange)

    db.flush()  # Lấy IDs

    # Notify admins
    _notify_admins(db, thread_id, sender_id, len(exchanges))

    return exchanges


def _notify_admins(db, thread_id: str, sender_id: str, count: int):
    from app.models.users import UserRole
    admins = db.query(User).filter(User.role == UserRole.admin).all()
    for admin in admins:
        notification = Notification(
            user_id=admin.id,
            type='CONTACT_INFO_ALERT',
            title="Phát hiện thông tin liên lạc",
            message=f"Có {count} thông tin liên lạc được gửi trong chat thread {thread_id}.",
            action_url=f"/admin/chat-monitor?thread={thread_id}",
        )
        db.add(notification)
