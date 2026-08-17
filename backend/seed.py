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
from app.models.contracts import Contract, ContractStatus, Milestone, MilestoneStatus
from app.models.jobs import Job
from app.models.freelancers import FrelancerProfile
from app.models.organizations import Organization

demo_user = db.query(User).first()
if not demo_user:
    print("  No users found, skipping disputes + messages seed")
else:
    demo_user_id = demo_user.id

    # ────── Seed demo contract (freelancer ↔ business) ──────
    freelancer_user = db.query(User).filter(User.email == "an.nguyen@example.vn").first()
    business_user = db.query(User).filter(User.email == "business@demo.vn").first()
    freelancer_profile = db.query(FrelancerProfile).filter(FrelancerProfile.user_id == (freelancer_user.id if freelancer_user else None)).first()
    organization = db.query(Organization).filter(Organization.owner_user_id == (business_user.id if business_user else None)).first()

    existing_contract = db.query(Contract).filter(Contract.proposal_id == None).first()
    if not existing_contract and freelancer_profile and organization:
        demo_job = db.query(Job).filter(Job.organization_id == organization.id, Job.status.in_(['OPEN', 'IN_PROGRESS'])).first()
        if not demo_job:
            # fallback: any open job
            demo_job = db.query(Job).first()
        if demo_job:
            c1 = Contract(
                id=str(uuid.uuid4()),
                job_id=demo_job.id,
                freelancer_id=freelancer_profile.user_id,
                organization_id=organization.id,
                proposal_id=None,
                total_amount=5_000_000,
                status=ContractStatus.active,
            )
            db.add(c1)
            db.flush()
            db.add(Milestone(
                id=str(uuid.uuid4()),
                contract_id=c1.id,
                sequence_no=1,
                title="Wireframe + Design mockup",
                description="Thiết kế wireframe cho 5 trang + mockup mobile-first tone navy/vàng đồng.",
                amount=2_000_000,
                status=MilestoneStatus.funded,
                due_at=datetime.now(timezone.utc),
            ))
            db.add(Milestone(
                id=str(uuid.uuid4()),
                contract_id=c1.id,
                sequence_no=2,
                title="HTML/CSS responsive",
                description="Convert mockup sang HTML/CSS responsive, tích hợp CMS.",
                amount=2_000_000,
                status=MilestoneStatus.draft,
            ))
            db.add(Milestone(
                id=str(uuid.uuid4()),
                contract_id=c1.id,
                sequence_no=3,
                title="Bug fix + deploy",
                description="Fix bug, tối ưu performance, deploy production.",
                amount=1_000_000,
                status=MilestoneStatus.draft,
            ))
            print(f"  Created contract: {c1.id} (5M VND, 3 milestones) for job {demo_job.id}")

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

    # Seed demo chat threads + messages (2 threads: business-freelancer + admin-monitoring)
    print("Seeding Demo Messages...")
    from app.models.freelancers import FrelancerProfile
    from app.models.organizations import Organization

    business_user = db.query(User).filter(User.email == "business@demo.vn").first()
    freelancer_user = db.query(User).filter(User.email == "an.nguyen@example.vn").first()
    admin_user = db.query(User).filter(User.email == "admin@demo.vn").first()

    thread_existing = db.query(ChatThread).first()
    if not thread_existing and business_user and freelancer_user and admin_user:
        # Thread 1: business ↔ freelancer (real conversation about a project)
        t1 = ChatThread(id=str(uuid.uuid4()), job_id=None)
        db.add(t1)
        db.flush()
        db.add(ThreadParticipant(thread_id=t1.id, user_id=business_user.id))
        db.add(ThreadParticipant(thread_id=t1.id, user_id=freelancer_user.id))
        conv1 = [
            (business_user.id, "Chào An, mình vừa duyệt hợp đồng landing page áo thun. Bạn có thể confirm lịch kickoff không?"),
            (freelancer_user.id, "Chào chị! Mình confirm nhận job. Dự kiến kickoff thứ 2 tuần sau (14/08) — 10h sáng có tiện không ạ?"),
            (business_user.id, "Ok 14/08 10h sáng. Mình sẽ gửi brief chi tiết + moodboard qua email sau."),
            (freelancer_user.id, "Dạ cảm ơn chị. Mình đã đọc sơ brief trong proposal rồi — sẽ chuẩn bị 2-3 phương án layout mobile-first."),
            (business_user.id, "Tuyệt. Budget đã ký quỹ trên sàn, milestone 1 (wireframe) thanh toán khi duyệt xong nhé."),
            (freelancer_user.id, "Hiểu rồi ạ. Mình sẽ bắt đầu phần research + wireframe ngay hôm nay."),
            (business_user.id, "À bạn nhớ dùng tone màu theo brand guideline mình gửi kèm nhé: xanh navy + vàng đồng."),
            (freelancer_user.id, "Note rồi ạ. Navy + vàng đồng, font Roboto. Mình sẽ gửi wireframe trong 3 ngày."),
        ]
        for sender_id, text in conv1:
            db.add(ChatMessage(id=str(uuid.uuid4()), thread_id=t1.id, sender_id=sender_id, content_text=text))
        print(f"  Thread #1 (business ↔ freelancer): {t1.id} with {len(conv1)} messages")

        # Thread 2: admin ↔ freelancer (verification/follow-up)
        t2 = ChatThread(id=str(uuid.uuid4()), job_id=None)
        db.add(t2)
        db.flush()
        db.add(ThreadParticipant(thread_id=t2.id, user_id=admin_user.id))
        db.add(ThreadParticipant(thread_id=t2.id, user_id=freelancer_user.id))
        conv2 = [
            (admin_user.id, "Chào bạn, mình là admin phụ trách xác minh hồ sơ. Bạn vừa upload CV đúng không?"),
            (freelancer_user.id, "Chào admin, đúng rồi ạ. Mình upload CV React Developer hôm qua."),
            (admin_user.id, "Mình thấy rồi. CV đạt 78% completeness. Còn thiếu phần chứng chỉ + portfolio thực tế. Bạn bổ sung trong 7 ngày nhé."),
            (freelancer_user.id, "Dạ, mình sẽ upload thêm 2 portfolio thực tế + bằng AWS Solutions Architect trong tuần này."),
            (admin_user.id, "Ok, deadline 23/08. Sau khi bổ sung, hồ sơ của bạn sẽ được verify và gắn huy hiệu 'Đã xác minh'."),
            (freelancer_user.id, "Cảm ơn admin, huy hiệu đó giúp mình tăng uy tín với khách hàng đúng không ạ?"),
            (admin_user.id, "Đúng. Freelancer 'Đã xác minh' được ưu tiên trong AI matching, tăng ~30% cơ hội được mời phỏng vấn."),
            (freelancer_user.id, "Tuyệt vời, mình sẽ hoàn thành đúng hạn ạ."),
        ]
        for sender_id, text in conv2:
            db.add(ChatMessage(id=str(uuid.uuid4()), thread_id=t2.id, sender_id=sender_id, content_text=text))
        print(f"  Thread #2 (admin ↔ freelancer): {t2.id} with {len(conv2)} messages")

        # Thread 3: admin ↔ business (escrow/contract issue)
        t3 = ChatThread(id=str(uuid.uuid4()), job_id=None)
        db.add(t3)
        db.flush()
        db.add(ThreadParticipant(thread_id=t3.id, user_id=admin_user.id))
        db.add(ThreadParticipant(thread_id=t3.id, user_id=business_user.id))
        conv3 = [
            (admin_user.id, "Demo Business, mình thấy bạn vừa tạo hợp đồng 5 triệu với freelancer An. Xác nhận đã ký quỹ đủ chưa?"),
            (business_user.id, "Chào admin, đã ký quỹ đủ 5 triệu. Mình thấy status 'ACTIVE' rồi."),
            (admin_user.id, "Ok. Lưu ý: nếu bạn duyệt milestone sai (approve trong khi chất lượng chưa đạt), freelancer có quyền mở dispute. Hãy review kỹ."),
            (business_user.id, "Mình hiểu. Mình sẽ review kỹ trước khi approve."),
            (admin_user.id, "Nếu cần hỗ trợ giải quyết tranh chấp, ping mình qua thread này nhé. Trung bình phản hồi trong 24h."),
        ]
        for sender_id, text in conv3:
            db.add(ChatMessage(id=str(uuid.uuid4()), thread_id=t3.id, sender_id=sender_id, content_text=text))
        print(f"  Thread #3 (admin ↔ business): {t3.id} with {len(conv3)} messages")
    elif thread_existing:
        print(f"  Threads already exist, skipping (existing={thread_existing.id})")

db.commit()
print("Done seeding.")
