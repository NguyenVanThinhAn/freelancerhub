import sys, os
sys.path.append('/Users/admin/Downloads/freelancerhub/backend')
from app.database import get_db
from app.models.categories import Category
from app.models.skills import Skill
from app.models.disputes import Dispute, DisputeEvidence, DisputeStatus, DisputeReasonCode, DisputeSeverity
from app.models.chat_threads import ChatThread
from app.models.chat_messages import ChatMessage
from app.models.thread_participants import ThreadParticipant
import uuid
from datetime import datetime, timezone

db = next(get_db())

categories = ["IT - Phần mềm", "Thiết kế đồ hoạ", "Marketing", "Dịch thuật"]
skills = ["Python", "React", "NodeJS", "UI/UX", "Figma", "SEO", "Tiếng Anh"]

print("Seeding Categories...")
for c in categories:
    if not db.query(Category).filter(Category.name == c).first():
        db.add(Category(name=c, description=f"{c} Category"))

print("Seeding Skills...")
for s in skills:
    if not db.query(Skill).filter(Skill.name == s).first():
        db.add(Skill(name=s, description=f"{s} Skill"))
db.commit()

# Seed demo disputes
print("Seeding Demo Disputes...")
from app.models.users import User
from app.models.contracts import Contract

demo_user = db.query(User).first()
if not demo_user:
    print("  No users found, skipping disputes + messages seed")
else:
    demo_user_id = demo_user.id

    demo_contract = db.query(Contract).first()
    if demo_contract:
        contract_id = demo_contract.id
        print(f"  Using contract_id: {contract_id}")

        # Dispute 1: OPEN (quality issue)
        existing = db.query(Dispute).filter(Dispute.reason_code == DisputeReasonCode.quality).first()
        if not existing:
            d1 = Dispute(
                id=str(uuid.uuid4()),
                contract_id=contract_id,
                opened_by=demo_user_id,
                reason_code=DisputeReasonCode.quality,
                description="Freelancer đã bàn giao sản phẩm nhưng chất lượng không đạt yêu cầu đã thỏa thuận. Font chữ sai, màu sắc không đúng brief. Yêu cầu làm lại hoặc hoàn tiền.",
                severity=DisputeSeverity.high,
                status=DisputeStatus.OPEN,
            )
            db.add(d1)
            db.flush()
            db.add(DisputeEvidence(
                id=str(uuid.uuid4()),
                dispute_id=d1.id,
                submitter_id=demo_user_id,
                evidence_text="Screenshot màn hình cho thấy font chữ Arial thay vì Roboto như yêu cầu. File brief gốc đính kèm.",
            ))
            print(f"  Created OPEN dispute: {d1.id}")

        # Dispute 2: RESOLVED (delivery issue)
        existing2 = db.query(Dispute).filter(Dispute.reason_code == DisputeReasonCode.delivery).first()
        if not existing2:
            d2 = Dispute(
                id=str(uuid.uuid4()),
                contract_id=contract_id,
                opened_by=demo_user_id,
                reason_code=DisputeReasonCode.delivery,
                description="Freelancer giao trễ deadline 5 ngày mà không thông báo trước. Ảnh hưởng đến kế hoạch marketing.",
                severity=DisputeSeverity.medium,
                status=DisputeStatus.RESOLVED_FREELANCER,
                resolution_notes="Freelancer chấp nhận trừ 20% giá trị milestone. Số tiền còn lại đã giải ngân.",
                assigned_to=demo_user_id,
                resolved_at=datetime.now(timezone.utc),
            )
            db.add(d2)
            print(f"  Created RESOLVED dispute: {d2.id}")
    else:
        print("  No contracts found, skipping disputes seed")

    # Seed demo chat thread + messages
    print("Seeding Demo Messages...")
    thread_existing = db.query(ChatThread).first()
    if not thread_existing:
        thread = ChatThread(
            id=str(uuid.uuid4()),
            job_id=None,
        )
        db.add(thread)
        db.flush()

        db.add(ThreadParticipant(
            thread_id=thread.id,
            user_id=demo_user_id,
            role="owner",
        ))

        messages = [
            ("Xin chào! Tôi thấy bạn có kinh nghiệm về thiết kế landing page. Bạn có thể làm được project này không?", demo_user_id),
            ("Xin chào! Có, tôi đã làm nhiều landing page cho các dự án startup. Bạn có thể chia sẻ thêm brief không?", demo_user_id),
            ("Đây là brief: Landing page bán áo thun, cần thiết kế hiện đại, tối ưu mobile-first. Budget khoảng 5 triệu.", demo_user_id),
            ("Sounds good! Tôi có thể bắt đầu trong tuần này. Thời gian dự kiến 10 ngày. Tôi sẽ gửi mockup trước.", demo_user_id),
            ("OK, tôi đồng ý. Mình sẽ ký hợp đồng qua sàn để đảm bảo an toàn cho cả hai bên nhé.", demo_user_id),
            ("Dạ không vấn đề gì! Cảm ơn bạn đã tin tưởng!", demo_user_id),
        ]

        for content_text, sender in messages:
            db.add(ChatMessage(
                id=str(uuid.uuid4()),
                thread_id=thread.id,
                sender_id=sender,
                content_text=content_text,
            ))
        print(f"  Created demo thread: {thread.id} with {len(messages)} messages")

db.commit()
print("Done seeding.")
