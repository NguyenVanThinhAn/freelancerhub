"""
Seed comprehensive demo data using ONLY existing users.

Goal: each non-CV feature has >=3 records, distributed across users.

Run: .venv/Scripts/python.exe seed_demo_data.py
"""
import os
import sys
import uuid
from datetime import datetime, timezone, timedelta

sys.path.insert(0, r'C:\Users\An\Downloads\freelancerhub-main\backend')
os.chdir(r'C:\Users\An\Downloads\freelancerhub-main\backend')

from app.database import get_db
from app.models.users import User, UserRole
from app.models.organizations import Organization
from app.models.freelancers import FrelancerProfile
from app.models.jobs import Job, JobStatus
from app.models.proposals import Proposal, ProposalStatus
from app.models.contracts import (
    Contract, ContractStatus,
    Milestone, MilestoneStatus,
    Deliverable, DeliverableStatus,
    Rating,
)
from app.models.finance import Wallet, Transaction, TransactionType, TransactionStatus
from app.models.chat_threads import ChatThread
from app.models.chat_messages import ChatMessage
from app.models.thread_participants import ThreadParticipant
from app.models.notifications import Notification, NotificationType
from app.models.disputes import (
    Dispute, DisputeEvidence, DisputeStatus, DisputeReasonCode, DisputeSeverity,
)
from app.models.categories import Category
from app.models.skills import Skill


def now():
    return datetime.now(timezone.utc)


def upsert(obj, db, key):
    """Add and flush. Returns the object (assumed new — caller checks existence first)."""
    db.add(obj)
    db.flush()
    return obj


def ensure_wallet(db, user_id: str, balance: float, locked: float = 0.0):
    w = db.query(Wallet).filter(Wallet.user_id == user_id).first()
    if w:
        w.balance = balance
        w.locked_balance = locked
        db.flush()
        return w
    w = Wallet(id=str(uuid.uuid4()), user_id=user_id, balance=balance, locked_balance=locked)
    db.add(w)
    db.flush()
    return w


def ensure_proposal(db, job_id, freelancer_id, cover, bid, status=ProposalStatus.PENDING, days_ago=0):
    p = Proposal(
        id=str(uuid.uuid4()),
        job_id=job_id,
        freelancer_id=freelancer_id,
        cover_letter=cover,
        bid_amount=bid,
        estimated_duration=14,
        status=status,
        created_at=now() - timedelta(days=days_ago),
    )
    db.add(p)
    db.flush()
    return p


def ensure_milestone(db, contract_id, seq, title, amount, status=MilestoneStatus.funded, days_until_due=14):
    m = Milestone(
        id=str(uuid.uuid4()),
        contract_id=contract_id,
        sequence_no=seq,
        title=title,
        amount=amount,
        status=status,
        due_at=now() + timedelta(days=days_until_due),
    )
    db.add(m)
    db.flush()
    return m


def ensure_deliverable(db, milestone_id, submitted_by, message='', status=DeliverableStatus.submitted):
    d = Deliverable(
        id=str(uuid.uuid4()),
        milestone_id=milestone_id,
        submitted_by=submitted_by,
        version_no=1,
        message=message,
        file_storage_keys=[],
        status=status,
        submitted_at=now(),
    )
    db.add(d)
    db.flush()
    return d


def ensure_thread(db, participants: list):
    """Create a thread + ensure all participants are linked."""
    t = ChatThread(id=str(uuid.uuid4()), job_id=None)
    db.add(t)
    db.flush()
    for uid in participants:
        existing = db.query(ThreadParticipant).filter(
            ThreadParticipant.thread_id == t.id, ThreadParticipant.user_id == uid
        ).first()
        if not existing:
            db.add(ThreadParticipant(thread_id=t.id, user_id=uid))
    db.flush()
    return t


def add_message(db, thread_id, sender_id, text, days_ago=0):
    m = ChatMessage(
        id=str(uuid.uuid4()),
        thread_id=thread_id,
        sender_id=sender_id,
        content_text=text,
        created_at=now() - timedelta(days=days_ago),
    )
    db.add(m)
    db.flush()
    return m


def ensure_notification(db, user_id, ntype, title, message, is_read=False, days_ago=0):
    n = Notification(
        id=str(uuid.uuid4()),
        user_id=user_id,
        type=ntype,
        title=title,
        message=message,
        is_read=is_read,
        created_at=now() - timedelta(days=days_ago),
    )
    db.add(n)
    db.flush()
    return n


def ensure_tx(db, wallet_id, amount, ttype, ref_id=None, status=TransactionStatus.COMPLETED, days_ago=0):
    t = Transaction(
        id=str(uuid.uuid4()),
        wallet_id=wallet_id,
        amount=amount,
        transaction_type=ttype,
        reference_id=ref_id,
        status=status,
        created_at=now() - timedelta(days=days_ago),
    )
    db.add(t)
    db.flush()
    return t


def ensure_rating(db, contract_id, reviewer_id, reviewee_id, score, comment=''):
    r = Rating(
        id=str(uuid.uuid4()),
        contract_id=contract_id,
        reviewer_id=reviewer_id,
        reviewee_id=reviewee_id,
        score=score,
        comment=comment,
        is_public=True,
    )
    db.add(r)
    db.flush()
    return r


# ─────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────
db = next(get_db())

# Resolve user IDs
USERS = {u.email: u.id for u in db.query(User).all()}
ORG_BY_OWNER = {o.owner_user_id: o for o in db.query(Organization).all()}
PROFILES = {p.user_id: p for p in db.query(FrelancerProfile).all()}

# Helpers
def user(email): return USERS[email]
def org_of(email): return ORG_BY_OWNER[USERS[email]]
def profile_of(email): return PROFILES[USERS[email]]


print('=' * 70)
print('STEP 1: WALLETS — ensure each user has balance ≥3M for demo')
print('=' * 70)

# Freelancer wallets (small balance — they earn money)
ensure_wallet(db, user('an.nguyen@example.vn'),     15_000_000, 2_000_000)
ensure_wallet(db, user('freelancer@example.com'),    8_500_000, 1_500_000)
ensure_wallet(db, user('f4d818f5')[:8] if False else user('chat@gmail.com'), 4_200_000, 0)
ensure_wallet(db, user('hoanglee1605@gmail.com'),    6_800_000, 800_000)
ensure_wallet(db, user('andepzai@gmail.com'),        3_100_000, 0)

# Enterprise wallets (large balance — they fund escrow)
ensure_wallet(db, user('business@demo.vn'),         15_000_000, 0)
ensure_wallet(db, user('business@example.com'),     25_000_000, 3_000_000)
ensure_wallet(db, user('andepzai2@gmail.com'),      10_000_000, 1_000_000)

# Admin wallet (small, no real money)
ensure_wallet(db, user('admin@demo.vn'),                0, 0)
ensure_wallet(db, user('admin@demo.com'),                0, 0)

print('Wallets ready')


print('=' * 70)
print('STEP 2: JOBS — pick OPEN jobs across categories for proposals')
print('=' * 70)
open_jobs = db.query(Job).filter(Job.status == JobStatus.OPEN).limit(15).all()
in_progress_jobs = db.query(Job).filter(Job.status == JobStatus.IN_PROGRESS).limit(10).all()
print(f'Found {len(open_jobs)} OPEN jobs, {len(in_progress_jobs)} IN_PROGRESS jobs')


print('=' * 70)
print('STEP 3: PROPOSALS — ensure each freelancer has ≥3 proposals')
print('=' * 70)

PROPOSAL_PLAN = [
    # (freelancer_email, job_idx_in_open_jobs, bid, status, days_ago, cover_letter)
    ('an.nguyen@example.vn',     0, 8_000_000, ProposalStatus.ACCEPTED,  30,
     'Tôi đã làm landing page tương tự cho 3 startup. Cam kết giao trong 10 ngày.'),
    ('an.nguyen@example.vn',     1, 12_000_000, ProposalStatus.PENDING,   7,
     'Có kinh nghiệm với React/Node + tích hợp payment gateway VNPay, Momo.'),
    ('an.nguyen@example.vn',     2, 6_500_000,  ProposalStatus.REJECTED,  14,
     'Thời gian ước tính 12 ngày. Em đính kèm portfolio 3 dự án gần nhất.'),
    ('an.nguyen@example.vn',     3, 4_500_000,  ProposalStatus.WITHDRAWN, 45,
     'Proposal rút vì em đã nhận job khác. Sẽ quay lại khi rảnh.'),

    ('freelancer@example.com',  4, 9_500_000,  ProposalStatus.PENDING,   3,
     'Mobile developer 4 năm kinh nghiệm, đã làm 8 app ecommerce/fintech.'),
    ('freelancer@example.com',  5, 7_200_000,  ProposalStatus.PENDING,   5,
     'Tôi có thể delivery MVP trong 14 ngày, tập trung UX/UI.'),
    ('freelancer@example.com',  6, 11_000_000, ProposalStatus.ACCEPTED,  20,
     'Tôi đã làm fintech app cho 2 ngân hàng. Bảo mật là ưu tiên #1.'),

    ('chat@gmail.com',          7, 5_500_000,  ProposalStatus.PENDING,   2,
     'Designer UI/UX 3 năm, focus vào mobile-first. Figma + After Effects.'),
    ('chat@gmail.com',          8, 3_800_000,  ProposalStatus.PENDING,   6,
     'Tôi sẽ cung cấp 2 design concept trước khi chốt. Free revision 2 lần.'),
    ('chat@gmail.com',          9, 6_200_000,  ProposalStatus.REJECTED,  10,
     'Tôi đã chuẩn bị moodboard tone pastel phù hợp brand.'),

    ('hoanglee1605@gmail.com', 10, 10_000_000, ProposalStatus.PENDING,   4,
     'Backend Python/Go 4 năm. CI/CD + Kubernetes setup sẵn cho cloud-native.'),
    ('hoanglee1605@gmail.com', 11, 14_000_000, ProposalStatus.ACCEPTED,  18,
     'Tôi đã tối ưu hệ thống tải 10K RPS cho 1 sàn TMĐT lớn.'),
    ('hoanglee1605@gmail.com', 12, 8_500_000,  ProposalStatus.PENDING,   1,
     'API design RESTful + GraphQL cho mobile client. OpenAPI 3.0 docs.'),

    ('andepzai@gmail.com',     13, 4_500_000,  ProposalStatus.PENDING,   8,
     'Frontend React/Next.js, tối ưu Core Web Vitals, SEO on-page.'),
    ('andepzai@gmail.com',     14, 5_500_000,  ProposalStatus.PENDING,   2,
     'Tôi sẽ tái sử dụng component library TailwindUI + customize.'),
    ('andepzai@gmail.com',      0, 7_500_000,  ProposalStatus.REJECTED,  20,
     'Có portfolio 5 dự án React tương tự, đính kèm link GitHub.'),
]

created_proposals = 0
for email, job_idx, bid, status, days_ago, cover in PROPOSAL_PLAN:
    if job_idx >= len(open_jobs):
        continue
    job = open_jobs[job_idx]
    fl_id = user(email)
    # Skip if proposal already exists for this job+freelancer
    existing = db.query(Proposal).filter(
        Proposal.job_id == job.id, Proposal.freelancer_id == fl_id
    ).first()
    if existing:
        continue
    ensure_proposal(db, job.id, fl_id, cover, bid, status=status, days_ago=days_ago)
    created_proposals += 1

print(f'Created {created_proposals} new proposals')


print('=' * 70)
print('STEP 4: CONTRACTS + MILESTONES — ensure each freelancer has ≥1 contract')
print('=' * 70)

# For each freelancer, ensure ≥1 ACTIVE contract + ≥3 milestones total

def create_contract_for(job, freelancer_email, business_email, total, num_milestones=3):
    """Create contract + milestones + optionally deliverables + escrow tx."""
    fl_id = user(freelancer_email)
    biz_id = user(business_email)
    org = ORG_BY_OWNER[biz_id]
    # Find accepted proposal if any
    proposal = db.query(Proposal).filter(
        Proposal.job_id == job.id,
        Proposal.freelancer_id == fl_id,
        Proposal.status == ProposalStatus.ACCEPTED,
    ).first()
    if proposal:
        proposal_id = proposal.id
    else:
        proposal_id = None
    # Create contract
    c = Contract(
        id=str(uuid.uuid4()),
        job_id=job.id,
        freelancer_id=fl_id,
        organization_id=org.id,
        proposal_id=proposal_id,
        total_amount=total,
        currency='VND',
        status=ContractStatus.active,
        started_at=now(),
    )
    db.add(c)
    db.flush()
    # Lock business wallet (escrow)
    biz_wallet = db.query(Wallet).filter(Wallet.user_id == biz_id).first()
    if biz_wallet:
        biz_wallet.balance -= total
        biz_wallet.locked_balance += total
        db.flush()
        ensure_tx(db, biz_wallet.id, total, TransactionType.ESCROW_LOCK, ref_id=c.id,
                  status=TransactionStatus.COMPLETED, days_ago=2)
    # Milestones
    per_ms = total // num_milestones
    for i in range(num_milestones):
        m_status = MilestoneStatus.funded if i == 0 else MilestoneStatus.draft
        ensure_milestone(db, c.id, i+1, f'Milestone {i+1}', per_ms, status=m_status, days_until_due=14*(i+1))
    return c


# Plan: 1 contract per freelancer × 5 freelancers = 5 contracts
CONTRACT_PLAN = [
    # (freelancer_email, business_email, job_idx_in_open_jobs, total)
    ('freelancer@example.com',  'business@example.com',  4, 9_500_000),
    ('chat@gmail.com',          'business@demo.vn',      7, 5_500_000),
    ('hoanglee1605@gmail.com',  'business@example.com', 11, 14_000_000),
    ('andepzai@gmail.com',      'business@demo.vn',     13, 4_500_000),
    ('andepzai2@gmail.com',     'business@example.com',  8, 6_200_000),  # andepzai2 is enterprise, but seeded as fl via profile
]

# Build contracts — ensure each freelancer has ≥1
created_contracts = []
for fl_email, biz_email, job_idx, total in CONTRACT_PLAN:
    if job_idx >= len(open_jobs):
        continue
    # Only create if freelancer has no contract yet
    fl_id = user(fl_email)
    existing = db.query(Contract).filter(Contract.freelancer_id == fl_id).first()
    if existing:
        print(f'  Skip {fl_email} — already has contract {existing.id[:8]}')
        continue
    # Ensure fl has profile (andepzai2 is enterprise user but treat as freelance via profile)
    if fl_email == 'andepzai2@gmail.com':
        # andepzai2 is enterprise, no freelancer profile. Use An instead
        fl_email = 'an.nguyen@example.vn'
        fl_id = user(fl_email)
        if db.query(Contract).filter(Contract.freelancer_id == fl_id).count() >= 2:
            print(f'  Skip An — already has 2 contracts')
            continue
    c = create_contract_for(open_jobs[job_idx], fl_email, biz_email, total)
    created_contracts.append(c)
    print(f'  Created contract {c.id[:8]} for {fl_email}: {total:,} VND')

# Add deliverable + payment + rating to 1 milestone (for completed work)
print()
print('Adding deliverables + payments to existing completed contracts...')
completed_contracts = db.query(Contract).filter(Contract.status == ContractStatus.completed).limit(3).all()
for c in completed_contracts:
    milestones = db.query(Milestone).filter(Milestone.contract_id == c.id).all()
    if not milestones:
        continue
    # Pick first milestone — submit deliverable + approve + release payment
    m = milestones[0]
    if db.query(Deliverable).filter(Deliverable.milestone_id == m.id).first():
        continue
    biz = db.query(User).filter(User.id == c.organization_id).first()  # actually owner_user
    org = db.query(Organization).filter(Organization.id == c.organization_id).first()
    biz_user = db.query(User).filter(User.id == org.owner_user_id).first() if org else None
    d = ensure_deliverable(db, m.id, c.freelancer_id,
                           message=f'Em đã hoàn thành milestone {m.title}, đính kèm source code + docs.',
                           status=DeliverableStatus.submitted)
    # Approve
    if biz_user:
        d.status = DeliverableStatus.approved
        d.reviewed_by = biz_user.id
        d.reviewed_at = now()
    m.status = MilestoneStatus.approved
    m.approved_at = now()
    m.paid_at = now()
    # Release payment
    biz_wallet = db.query(Wallet).filter(Wallet.user_id == biz_user.id).first() if biz_user else None
    fl_wallet = db.query(Wallet).filter(Wallet.user_id == c.freelancer_id).first()
    if biz_wallet and fl_wallet:
        biz_wallet.locked_balance -= m.amount
        biz_wallet.balance -= 0  # already locked, just unlock
        fl_wallet.balance += m.amount
        m.status = MilestoneStatus.paid
        db.flush()
        ensure_tx(db, biz_wallet.id, m.amount, TransactionType.ESCROW_RELEASE, ref_id=c.id, days_ago=5)
        ensure_tx(db, fl_wallet.id, m.amount, TransactionType.PAYMENT_RECEIVED, ref_id=c.id, days_ago=5)
    # Rating
    if biz_user and not db.query(Rating).filter(Rating.contract_id == c.id).first():
        ensure_rating(db, c.id, biz_user.id, c.freelancer_id, 4.5,
                      'Freelancer giao đúng hạn, code sạch, giao tiếp tốt.')

print(f'Created {len(created_contracts)} new contracts')


print('=' * 70)
print('STEP 5: CHAT THREADS — ensure each freelancer has ≥1 thread')
print('=' * 70)

# Plan: each freelancer ↔ each business (≥3 threads each = Mai↔Business, Mai↔Admin, Mai↔BizEnterprise...)
THREAD_PLAN = [
    # (participants as emails, conversation)
    (
        ['chat@gmail.com', 'business@demo.vn'],
        [
            ('business@demo.vn', 'Chào Mai, mình thấy bạn có portfolio UI/UX đẹp. Bạn có quan tâm project redesign app mobile không?'),
            ('chat@gmail.com', 'Chào chị, em quan tâm ạ! Chị có thể share brief không?'),
            ('business@demo.vn', 'Brief đây: redesign app mobile ngân hàng, focus UX cho Gen Z. Budget 15M, deadline 30 ngày.'),
            ('chat@gmail.com', 'Em có thể bắt đầu tuần sau. Em sẽ gửi wireframe + moodboard trong 5 ngày đầu.'),
            ('business@demo.vn', 'Tuyệt! Mình sẽ tạo proposal qua sàn. Bạn kiểm tra email nhé.'),
        ],
    ),
    (
        ['chat@gmail.com', 'admin@demo.vn'],
        [
            ('admin@demo.vn', 'Chào Mai, hồ sơ của bạn đã được duyệt 78%. Bạn cần bổ sung portfolio thực tế để đạt huy hiệu "Đã xác minh".'),
            ('chat@gmail.com', 'Chào admin, em sẽ upload 3 portfolio trong tuần này ạ.'),
            ('admin@demo.vn', 'Tốt. Sau khi upload, đội admin review trong 3 ngày làm việc.'),
        ],
    ),
    (
        ['chat@gmail.com', 'freelancer@example.com'],
        [
            ('freelancer@example.com', 'Mai ơi, mình muốn collab project mobile sắp tới. Bạn làm UI mình làm backend nha.'),
            ('chat@gmail.com', 'Ok Hùng, mình thấy hay. Mình sẽ follow trên Behance.'),
        ],
    ),
    (
        ['hoanglee1605@gmail.com', 'business@example.com'],
        [
            ('business@example.com', 'Hoàng, bên mình cần senior backend dev cho fintech project. Bạn có rảnh không?'),
            ('hoanglee1605@gmail.com', 'Chào anh, em rảnh tuần sau. Tech stack gì ạ?'),
            ('business@example.com', 'Python + FastAPI + PostgreSQL + Redis. CI/CD GitHub Actions.'),
            ('hoanglee1605@gmail.com', 'Em quen hết. Em sẽ báo giá qua proposal trong 2 ngày.'),
        ],
    ),
    (
        ['hoanglee1605@gmail.com', 'admin@demo.vn'],
        [
            ('admin@demo.vn', 'Hoàng, bạn đã có chứng chỉ AWS Solutions Architect chưa? Nếu có thì profile rank cao hơn nhiều.'),
            ('hoanglee1605@gmail.com', 'Em có rồi ạ, em sẽ upload PDF lên hồ sơ trong hôm nay.'),
            ('admin@demo.vn', 'Cảm ơn. Mình sẽ verify trong 24h.'),
        ],
    ),
    (
        ['andepzai@gmail.com', 'business@demo.vn'],
        [
            ('business@demo.vn', 'Quân, mình cần 1 landing page cho sự kiện ra mắt sản phẩm. Budget 4.5M, deadline 10 ngày.'),
            ('andepzai@gmail.com', 'Chào chị, em làm được. Em sẽ giao mockup trong 3 ngày đầu.'),
            ('business@demo.vn', 'OK, mình sẽ chuyển tiền qua sàn. Bạn bắt đầu ngay nhé.'),
        ],
    ),
    (
        ['andepzai@gmail.com', 'admin@demo.vn'],
        [
            ('admin@demo.vn', 'Quân, bạn còn thiếu phần kinh nghiệm làm việc (work history) trong profile. Bổ sung để AI matching đề xuất bạn tốt hơn.'),
            ('andepzai@gmail.com', 'Cảm ơn admin, em sẽ bổ sung sau.'),
        ],
    ),
    (
        ['freelancer@example.com', 'admin@demo.vn'],
        [
            ('admin@demo.vn', 'Hùng, hồ sơ của bạn rất tốt. Bạn đã qualify cho chương trình "Freelancer Verified Pro".'),
            ('freelancer@example.com', 'Cảm ơn admin! Verified Pro có quyền lợi gì thêm ạ?'),
            ('admin@demo.vn', 'Được ưu tiên trong AI matching, fee giảm 30%, và badge vàng hiển thị trên profile.'),
        ],
    ),
    (
        ['freelancer@example.com', 'business@example.com'],
        [
            ('business@example.com', 'Hùng, mình muốn confirm MVP cho fintech app. Bạn có free 30h/tuần không?'),
            ('freelancer@example.com', 'Dạ em có. Em confirm kickoff thứ 2 tuần sau ạ.'),
            ('business@example.com', 'OK, mình sẽ gửi API spec + design system trước thứ 6.'),
            ('freelancer@example.com', 'Nhận rồi ạ. Em sẽ setup repo + CI trước ngày bắt đầu.'),
        ],
    ),
]

threads_created = 0
for participants_emails, conversation in THREAD_PLAN:
    parts = [user(e) for e in participants_emails]
    # Check existing thread with same participants
    existing_thread = None
    for t in db.query(ChatThread).all():
        t_parts = {tp.user_id for tp in t.participants}
        if t_parts == set(parts):
            existing_thread = t
            break
    if existing_thread:
        # Ensure ≥3 messages
        n_msgs = db.query(ChatMessage).filter(ChatMessage.thread_id == existing_thread.id).count()
        if n_msgs >= 3:
            continue
        t = existing_thread
    else:
        t = ensure_thread(db, parts)
        threads_created += 1
    # Add conversation messages
    for i, (sender_email, text) in enumerate(conversation):
        add_message(db, t.id, user(sender_email), text, days_ago=len(conversation)-i)

print(f'Created {threads_created} new threads')


print('=' * 70)
print('STEP 6: NOTIFICATIONS — ensure each user has ≥3 notifications')
print('=' * 70)

# Plan per user
NOTIF_PLAN = [
    ('chat@gmail.com', [
        (NotificationType.JOB_INVITE, 'Bạn được mời ứng tuyển', 'Business Co. mời bạn vào dự án Redesign App Mobile. Xem ngay!', True,  5),
        (NotificationType.MESSAGE_RECEIVED, 'Tin nhắn mới', 'Bạn có tin nhắn mới từ Business Co.', False, 1),
        (NotificationType.VERIFICATION_NEEDS_MORE_INFO, 'Cần bổ sung hồ sơ', 'Upload 2 portfolio thực tế để đạt Verified.', False, 3),
    ]),
    ('hoanglee1605@gmail.com', [
        (NotificationType.JOB_INVITE, 'Cơ hội mới', 'Business Enterprise JSC mời bạn dự án Backend Python.', True,  8),
        (NotificationType.MESSAGE_RECEIVED, 'Tin nhắn mới', 'Admin gửi tin nhắn về chứng chỉ AWS.', False, 2),
        (NotificationType.CV_VERIFIED, 'CV đã verify', 'CV của bạn đã được xác minh thành công!', False, 4),
    ]),
    ('andepzai@gmail.com', [
        (NotificationType.JOB_INVITE, 'Match với dự án Frontend', 'AI matching gợi ý 3 dự án React/Next.js phù hợp.', True,  6),
        (NotificationType.MESSAGE_RECEIVED, 'Tin nhắn mới', 'Business Co. liên hệ về landing page.', False, 3),
        (NotificationType.SYSTEM, 'Bảo trì hệ thống', 'Hệ thống sẽ bảo trì 23h-1h đêm nay.', False, 1),
    ]),
    ('business@example.com', [
        (NotificationType.JOB_INVITE, 'Freelancer ứng tuyển', '3 freelancer mới ứng tuyển vào dự án của bạn.', True,  10),
        (NotificationType.SYSTEM, 'Cập nhật chính sách', 'Phí escrow giảm từ 5% xuống 3% đến hết tháng.', False, 5),
        (NotificationType.MESSAGE_RECEIVED, 'Tin nhắn mới', 'Freelancer Hùng liên hệ về fintech app.', False, 1),
    ]),
    ('andepzai2@gmail.com', [
        (NotificationType.VERIFICATION_NEEDS_MORE_INFO, 'Xác minh doanh nghiệp', 'Upload Giấy phép kinh doanh để hoàn tất xác minh.', True,  7),
        (NotificationType.JOB_INVITE, 'Match freelancer', 'Có 2 freelancer phù hợp dự án của bạn.', False, 2),
        (NotificationType.SYSTEM, 'Chào mừng', 'Chào mừng bạn đến với FreelancerHub!', False, 14),
    ]),
    ('admin@demo.com', [
        (NotificationType.SYSTEM, 'Báo cáo tuần', '5 dispute mới + 12 freelancer cần verify.', False, 3),
        (NotificationType.JOB_INVITE, 'Phân công', 'Có 2 dispute mới cần bạn review.', False, 1),
        (NotificationType.CV_VERIFIED, 'Có hồ sơ mới', 'Freelancer mới upload CV, cần verify.', False, 5),
    ]),
    ('business@demo.vn', [
        (NotificationType.SYSTEM, 'Demo ready', 'Hệ thống đã seed 3 demo chat + 1 demo contract.', False, 0),
        (NotificationType.MESSAGE_RECEIVED, 'Tin nhắn từ Admin', 'Admin hỏi về escrow policy.', False, 2),
        (NotificationType.CV_VERIFIED, 'Freelancer verified', 'An đã verified, có thể hire ngay.', False, 4),
    ]),
    ('an.nguyen@example.vn', [
        (NotificationType.SYSTEM, 'CV Verified', 'CV của bạn đã được xác minh bởi admin.', True, 30),
        (NotificationType.MESSAGE_RECEIVED, 'Tin nhắn mới từ Business', 'Business xác nhận milestone 1.', False, 1),
        (NotificationType.JOB_INVITE, 'Cơ hội mới', '2 dự án React Native mới phù hợp bạn.', False, 2),
    ]),
]

notifs_created = 0
for email, items in NOTIF_PLAN:
    uid = user(email)
    existing = db.query(Notification).filter(Notification.user_id == uid).count()
    for ntype, title, msg, is_read, days_ago in items:
        # Skip if exact same title+message exists for this user
        dup = db.query(Notification).filter(
            Notification.user_id == uid, Notification.title == title, Notification.message == msg
        ).first()
        if dup:
            continue
        ensure_notification(db, uid, ntype, title, msg, is_read=is_read, days_ago=days_ago)
        notifs_created += 1

print(f'Created {notifs_created} new notifications')


print('=' * 70)
print('STEP 7: DISPUTES — ensure ≥3 disputes with various statuses')
print('=' * 70)

# Existing: 1 OPEN (quality), 1 RESOLVED_FREELANCER (delivery) — already 2
# Add 1 more: UNDER_REVIEW (payment), 1 MUTUAL_AGREEMENT (conduct)
DISPUTE_PLAN = [
    # (contract_id, opened_by_email, reason, severity, status, description, moderator_email, resolution)
    ('339cd9d5-1cf7-4753-84e6-29804f9cf7a1', 'business@demo.vn', DisputeReasonCode.payment, DisputeSeverity.medium,
     DisputeStatus.UNDER_REVIEW,
     'Freelancer yêu cầu thanh toán milestone #2 nhưng chưa đạt yêu cầu kỹ thuật. Yêu cầu admin review.',
     'admin@demo.vn', None, 7),
    (None, 'business@demo.vn', DisputeReasonCode.conduct, DisputeSeverity.low,
     DisputeStatus.MUTUAL_AGREEMENT,
     'Freelancer giao tiếp không chuyên nghiệp. Hai bên đã thống nhất hủy hợp đồng, hoàn 50% tiền.',
     'admin@demo.com',
     'Hai bên đồng ý hủy hợp đồng. Hoàn 50% escrow cho client, 50% cho freelancer.', 15),
]

disputes_created = 0
for contract_id, opened_email, reason, severity, status, desc, mod_email, resolution, days_ago in DISPUTE_PLAN:
    if contract_id is None:
        # pick any contract
        contract_id = db.query(Contract).first()
        if not contract_id:
            continue
        contract_id = contract_id.id
    opened_by = user(opened_email)
    mod_id = user(mod_email) if mod_email else None
    existing = db.query(Dispute).filter(
        Dispute.contract_id == contract_id, Dispute.reason_code == reason, Dispute.status == status
    ).first()
    if existing:
        continue
    d = Dispute(
        id=str(uuid.uuid4()),
        contract_id=contract_id,
        opened_by=opened_by,
        reason_code=reason,
        description=desc,
        severity=severity,
        status=status,
        assigned_to=mod_id,
        assigned_at=now() - timedelta(days=days_ago),
        resolved_at=now() - timedelta(days=days_ago-1) if status in (DisputeStatus.RESOLVED_FREELANCER, DisputeStatus.RESOLVED_CLIENT, DisputeStatus.MUTUAL_AGREEMENT) else None,
        resolution_notes=resolution,
    )
    db.add(d)
    db.flush()
    disputes_created += 1
    # Evidence
    db.add(DisputeEvidence(
        id=str(uuid.uuid4()),
        dispute_id=d.id,
        submitter_id=opened_by,
        evidence_text=f'Screenshot + logs đính kèm cho dispute #{reason.value}',
    ))

print(f'Created {disputes_created} new disputes')


print('=' * 70)
print('STEP 8: TRANSACTIONS — ensure ≥3 per user with wallet')
print('=' * 70)

# Plan deposits, withdrawals, payments
TX_PLAN = [
    # (email, amount, ttype, days_ago)
    ('business@demo.vn',         10_000_000, TransactionType.DEPOSIT, 30),
    ('business@demo.vn',          5_000_000, TransactionType.ESCROW_LOCK, 20),
    ('business@demo.vn',          3_000_000, TransactionType.ESCROW_RELEASE, 5),

    ('business@example.com',      15_000_000, TransactionType.DEPOSIT, 25),
    ('business@example.com',      8_000_000, TransactionType.ESCROW_LOCK, 10),
    ('business@example.com',      4_000_000, TransactionType.PAYMENT_SENT, 2),

    ('an.nguyen@example.vn',      5_000_000, TransactionType.PAYMENT_RECEIVED, 60),
    ('an.nguyen@example.vn',      2_000_000, TransactionType.PAYMENT_RECEIVED, 40),
    ('an.nguyen@example.vn',      1_500_000, TransactionType.WITHDRAWAL, 7),

    ('freelancer@example.com',   4_500_000, TransactionType.PAYMENT_RECEIVED, 50),
    ('freelancer@example.com',   2_000_000, TransactionType.PAYMENT_RECEIVED, 30),
    ('freelancer@example.com',   1_000_000, TransactionType.WITHDRAWAL, 14),

    ('chat@gmail.com',           2_000_000, TransactionType.PAYMENT_RECEIVED, 45),
    ('chat@gmail.com',           1_500_000, TransactionType.PAYMENT_RECEIVED, 20),
    ('chat@gmail.com',             500_000, TransactionType.WITHDRAWAL, 5),

    ('hoanglee1605@gmail.com',   3_000_000, TransactionType.PAYMENT_RECEIVED, 60),
    ('hoanglee1605@gmail.com',   2_500_000, TransactionType.PAYMENT_RECEIVED, 30),
    ('hoanglee1605@gmail.com',     800_000, TransactionType.WITHDRAWAL, 10),

    ('andepzai@gmail.com',       1_800_000, TransactionType.PAYMENT_RECEIVED, 40),
    ('andepzai@gmail.com',       1_200_000, TransactionType.PAYMENT_RECEIVED, 18),
    ('andepzai@gmail.com',         300_000, TransactionType.WITHDRAWAL, 3),
]

tx_created = 0
for email, amount, ttype, days_ago in TX_PLAN:
    w = db.query(Wallet).filter(Wallet.user_id == user(email)).first()
    if not w:
        continue
    # Idempotent: check by amount+type+wallet
    existing = db.query(Transaction).filter(
        Transaction.wallet_id == w.id, Transaction.amount == amount, Transaction.transaction_type == ttype
    ).first()
    if existing:
        continue
    ensure_tx(db, w.id, amount, ttype, days_ago=days_ago)
    tx_created += 1

print(f'Created {tx_created} new transactions')


# ─────────────────────────────────────────────────────────────────
db.commit()
print()
print('=' * 70)
print('DONE. Now verifying counts per user.')
print('=' * 70)

for u in db.query(User).all():
    proposals = db.query(Proposal).filter(Proposal.freelancer_id == u.id).count()
    contracts = db.query(Contract).filter(Contract.freelancer_id == u.id).count()
    contracts_as_biz = db.query(Contract).join(Organization, Contract.organization_id == Organization.id).filter(
        Organization.owner_user_id == u.id
    ).count()
    threads = db.query(ThreadParticipant).filter(ThreadParticipant.user_id == u.id).count()
    notifs = db.query(Notification).filter(Notification.user_id == u.id).count()
    wallet = db.query(Wallet).filter(Wallet.user_id == u.id).first()
    txs = db.query(Transaction).filter(Transaction.wallet_id == wallet.id).count() if wallet else 0
    print(f'  {u.email:35} | role={u.role.value:10} | proposals={proposals} contracts_fl={contracts} contracts_biz={contracts_as_biz} threads={threads} notifs={notifs} wallet_tx={txs}')

print()
print(f'Total Proposals: {db.query(Proposal).count()}')
print(f'Total Contracts: {db.query(Contract).count()}')
print(f'Total Milestones: {db.query(Milestone).count()}')
print(f'Total Deliverables: {db.query(Deliverable).count()}')
print(f'Total ChatThreads: {db.query(ChatThread).count()}')
print(f'Total ChatMessages: {db.query(ChatMessage).count()}')
print(f'Total Notifications: {db.query(Notification).count()}')
print(f'Total Disputes: {db.query(Dispute).count()}')
print(f'Total Wallets: {db.query(Wallet).count()}')
print(f'Total Transactions: {db.query(Transaction).count()}')
print(f'Total Ratings: {db.query(Rating).count()}')


# ─────────────────────────────────────────────────────────────────
# STEP 9: BACKFILL MILESTONES + DELIVERABLES for contracts with 0 milestones
# ─────────────────────────────────────────────────────────────────
print('=' * 70)
print('STEP 9: BACKFILL MILESTONES + DELIVERABLES for empty contracts')
print('=' * 70)

MILESTONE_TITLES = [
    ('Khảo sát & Phân tích yêu cầu', 0.25),
    ('Thiết kế UI/UX + Wireframe',     0.30),
    ('Phát triển & Implement',         0.30),
    ('Testing & Bug fix',             0.10),
    ('Deploy & Bàn giao',             0.05),
]

empty_contracts = [c for c in db.query(Contract).all()
                   if db.query(Milestone).filter(Milestone.contract_id == c.id).count() == 0]

added_m = 0
added_d = 0
added_r = 0
for c in empty_contracts:
    org = db.query(Organization).filter(Organization.id == c.organization_id).first()
    biz_user = db.query(User).filter(User.id == org.owner_user_id).first() if org else None
    total = c.total_amount
    for i, (title, pct) in enumerate(MILESTONE_TITLES[:3]):
        amount = total * pct
        if i == 0:
            status = MilestoneStatus.paid if c.status == ContractStatus.completed \
                else (MilestoneStatus.in_progress if c.status == ContractStatus.active else MilestoneStatus.funded)
        else:
            status = MilestoneStatus.funded if c.status == ContractStatus.active else MilestoneStatus.draft
        m = Milestone(
            id=str(uuid.uuid4()),
            contract_id=c.id,
            sequence_no=i+1,
            title=title,
            amount=amount,
            status=status,
            due_at=now + timedelta(days=14*(i+1)),
            approved_at=now if status in (MilestoneStatus.approved, MilestoneStatus.paid) else None,
            paid_at=now if status == MilestoneStatus.paid else None,
        )
        db.add(m)
        db.flush()
        added_m += 1
        if status in (MilestoneStatus.approved, MilestoneStatus.paid):
            if not db.query(Deliverable).filter(Deliverable.milestone_id == m.id).first():
                d = Deliverable(
                    id=str(uuid.uuid4()),
                    milestone_id=m.id,
                    submitted_by=c.freelancer_id,
                    version_no=1,
                    message=f'Em đã hoàn thành {title}. Đính kèm source code + docs.',
                    file_storage_keys=[],
                    status=DeliverableStatus.approved,
                    submitted_at=now - timedelta(days=5),
                    reviewed_by=biz_user.id if biz_user else None,
                    reviewed_at=now - timedelta(days=3),
                )
                db.add(d)
                db.flush()
                added_d += 1
    if c.status == ContractStatus.completed:
        if not db.query(Rating).filter(Rating.contract_id == c.id).first():
            score = 4.5 + (hash(c.id) % 5) * 0.1
            if biz_user:
                r = Rating(
                    id=str(uuid.uuid4()),
                    contract_id=c.id,
                    reviewer_id=biz_user.id,
                    reviewee_id=c.freelancer_id,
                    score=min(score, 5.0),
                    comment='Freelancer giao đúng hạn, code sạch, giao tiếp chuyên nghiệp.',
                    is_public=True,
                )
                db.add(r)
                db.flush()
                added_r += 1

print(f'  Backfilled: {added_m} milestones, {added_d} deliverables, {added_r} ratings')


# ─────────────────────────────────────────────────────────────────
# STEP 10: FILL NOTIFICATION GAPS for users with <3
# ─────────────────────────────────────────────────────────────────
print('=' * 70)
print('STEP 10: NOTIFICATIONS — fill gaps so each user has >=3')
print('=' * 70)

gap_notifs = 0
for u in db.query(User).all():
    n = db.query(Notification).filter(Notification.user_id == u.id).count()
    if n >= 3:
        continue
    needed = 3 - n
    # Generic fallback notifications
    fallback = [
        (NotificationType.SYSTEM, 'Chào mừng bạn', 'Chào mừng bạn đến với FreelancerHub!', False, 14),
        (NotificationType.CV_VERIFIED, 'CV đã xác minh', 'CV của bạn đã được verify thành công.', True, 30),
        (NotificationType.JOB_INVITE, 'Cơ hội mới', 'AI matching gợi ý dự án phù hợp với bạn.', False, 5),
    ]
    for ntype, title, msg, is_read, days in fallback[:needed]:
        dup = db.query(Notification).filter(
            Notification.user_id == u.id,
            Notification.title == title,
        ).first()
        if dup:
            continue
        ensure_notification(db, u.id, ntype, title, msg, is_read=is_read, days_ago=days)
        gap_notifs += 1

print(f'  Added {gap_notifs} gap-filling notifications')


# ─────────────────────────────────────────────────────────────────
# STEP 11: BACKFILL BUSINESS CONTRACTS — business@example.com needs >=3
# ─────────────────────────────────────────────────────────────────
print('=' * 70)
print('STEP 11: BACKFILL business@example.com contracts')
print('=' * 70)

biz2_uid = user('business@example.com')
biz2_org = db.query(Organization).filter(Organization.owner_user_id == biz2_uid).first()
existing = db.query(Contract).join(Organization, Contract.organization_id == Organization.id).filter(
    Organization.owner_user_id == biz2_uid
).count()

if existing < 3 and biz2_org:
    fl_list = ['an.nguyen@example.vn', 'freelancer@example.com', 'hoanglee1605@gmail.com']
    open_jobs = db.query(Job).filter(Job.status == JobStatus.OPEN).limit(5).all()
    added = 0
    for i, fl_email in enumerate(fl_list):
        if added >= (3 - existing):
            break
        fl_uid = user(fl_email)
        already = db.query(Contract).join(Organization, Contract.organization_id == Organization.id).filter(
            Organization.owner_user_id == biz2_uid, Contract.freelancer_id == fl_uid
        ).first()
        if already:
            continue
        job = open_jobs[i % len(open_jobs)]
        proposal = db.query(Proposal).filter(
            Proposal.job_id == job.id, Proposal.freelancer_id == fl_uid
        ).first()
        proposal_id = proposal.id if proposal else None
        total = 8_000_000 + i * 2_000_000
        c = Contract(
            id=str(uuid.uuid4()),
            job_id=job.id,
            freelancer_id=fl_uid,
            organization_id=biz2_org.id,
            proposal_id=proposal_id,
            total_amount=total,
            currency='VND',
            status=ContractStatus.active,
            started_at=now,
        )
        db.add(c)
        db.flush()
        for j in range(3):
            status = MilestoneStatus.in_progress if j == 0 else MilestoneStatus.funded
            m = Milestone(
                id=str(uuid.uuid4()),
                contract_id=c.id,
                sequence_no=j+1,
                title=f'Milestone {j+1}',
                amount=total/3,
                status=status,
                due_at=now + timedelta(days=14*(j+1)),
            )
            db.add(m)
        biz_wallet = db.query(Wallet).filter(Wallet.user_id == biz2_uid).first()
        if biz_wallet:
            biz_wallet.balance -= total
            biz_wallet.locked_balance += total
            db.flush()
            t = Transaction(
                id=str(uuid.uuid4()),
                wallet_id=biz_wallet.id,
                amount=total,
                transaction_type=TransactionType.ESCROW_LOCK,
                reference_id=c.id,
                status=TransactionStatus.COMPLETED,
                created_at=now - timedelta(days=2),
            )
            db.add(t)
        added += 1
        print(f'  Added contract {c.id[:8]} for {fl_email}')


# ─────────────────────────────────────────────────────────────────
# STEP 12: RESET PASSWORDS for non-demo accounts (so they can log in)
# ─────────────────────────────────────────────────────────────────
print('=' * 70)
print('STEP 12: RESET PASSWORDS for non-demo accounts')
print('=' * 70)

from app.core.security import hash_password

PASSWORD_MAP = {
    'chat@gmail.com':           'Chat1234!',
    'hoanglee1605@gmail.com':   'Hoang1234!',
    'andepzai@gmail.com':       'Quan1234!',
    'andepzai2@gmail.com':      'Andepzai1234!',
    'business@example.com':     'BizEx1234!',
    'freelancer@example.com':   'Hung1234!',
    'admin@demo.com':           'AdminDemo1234!',
    'business@demo.vn':         'Business1234!',
    'an.nguyen@example.vn':     'Freelancer1234!',
    'admin@demo.vn':            'Admin1234!',
}

pwd_reset = 0
for email, new_pwd in PASSWORD_MAP.items():
    u = db.query(User).filter(User.email == email).first()
    if u:
        u.password_hash = hash_password(new_pwd)
        pwd_reset += 1

print(f'  Reset {pwd_reset} passwords')


# ─────────────────────────────────────────────────────────────────
# STEP 14: CROSS-LINK — every freelancer ↔ every enterprise = threads + proposals
# ─────────────────────────────────────────────────────────────────
print('=' * 70)
print('STEP 14: CROSS-LINK — accounts cross-referenced')
print('=' * 70)

from app.models.proposals import Proposal, ProposalStatus
from app.models.jobs import JobStatus as JobStatusEnum, JobPaymentType
from app.models.freelancers import FrelancerProfile

ENTERPRISES = ['business@demo.vn', 'business@example.com', 'andepzai2@gmail.com']
FREELANCERS = ['an.nguyen@example.vn', 'chat@gmail.com', 'hoanglee1605@gmail.com',
               'andepzai@gmail.com', 'freelancer@example.com']
ALL_USERS = ENTERPRISES + FREELANCERS + ['admin@demo.vn', 'admin@demo.com']

# 14a) Ensure andepzai2 has org + jobs
biz_a2 = db.query(User).filter(User.email == 'andepzai2@gmail.com').first()
org_a2 = db.query(Organization).filter(Organization.owner_user_id == biz_a2.id).first()
if not org_a2:
    org_a2 = Organization(
        id=str(uuid.uuid4()),
        owner_user_id=biz_a2.id,
        name='AnDepZai Studios',
        slug='andepzai-studios',
        description='Studio thiết kế game indie + branding cho startup công nghệ.',
        industry='Gaming & Entertainment',
        head_count=10,
        verification_status='VERIFIED',
        created_at=now() - timedelta(days=120),
    )
    db.add(org_a2)
    db.flush()
    print(f'  Created org: AnDepZai Studios')

existing_jobs_a2 = db.query(Job).filter(Job.organization_id == org_a2.id).count()
if existing_jobs_a2 < 3:
    a2_jobs = [
        'Thiết kế UI/UX cho game mobile puzzle',
        'Branding cho startup công nghệ AI',
        'Animation 2D cho trailer game indie',
    ]
    for idx, title in enumerate(a2_jobs):
        if db.query(Job).filter(Job.organization_id == org_a2.id, Job.title == title).first():
            continue
        j = Job(
            id=str(uuid.uuid4()),
            organization_id=org_a2.id,
            title=title,
            description=f'Dự án {title}. Yêu cầu freelancer có portfolio phù hợp. Làm việc remote full-time/part-time linh hoạt. Thanh toán qua escrow.',
            status=JobStatusEnum.OPEN if idx == 0 else JobStatusEnum.IN_PROGRESS,
            budget_min=3000,
            budget_max=10000,
            payment_type=JobPaymentType.FIXED,
            created_at=now() - timedelta(days=30 - idx*5),
        )
        db.add(j)
    db.flush()
    print(f'  Added 3 jobs for andepzai2')

# 14b) Cross-proposals: every freelancer ↔ every org job
all_jobs_by_org = {}
for ent_email in ENTERPRISES:
    ent_id = USERS[ent_email]
    org = db.query(Organization).filter(Organization.owner_user_id == ent_id).first()
    if org:
        all_jobs_by_org[ent_email] = db.query(Job).filter(Job.organization_id == org.id).all()

proposals_added = 0
for ent_email, jobs in all_jobs_by_org.items():
    for i, fl_email in enumerate(FREELANCERS):
        fl_id = USERS[fl_email]
        fl_prof = db.query(FrelancerProfile).filter(FrelancerProfile.user_id == fl_id).first()
        if not fl_prof:
            fl_prof = FrelancerProfile(
                user_id=fl_id,
                display_name=fl_email.split('@')[0],
                created_at=now() - timedelta(days=100),
            )
            db.add(fl_prof)
            db.flush()
        for j in jobs:
            if db.query(Proposal).filter(Proposal.job_id == j.id, Proposal.freelancer_id == fl_prof.user_id).first():
                continue
            if db.query(Proposal).filter(Proposal.job_id == j.id).count() >= 4:
                break
            db.add(Proposal(
                id=str(uuid.uuid4()),
                job_id=j.id,
                freelancer_id=fl_prof.user_id,
                cover_letter=f'Chào {ent_email}, em là {fl_email.split("@")[0]}. Em rất quan tâm đến dự án "{j.title[:30]}" của bên mình. Em có portfolio phù hợp và sẵn sàng bắt đầu ngay. Mong được hợp tác!',
                bid_amount=5000 + (i * 1500),
                estimated_duration=14,
                status=ProposalStatus.PENDING,
                created_at=now() - timedelta(days=20-i*2),
            ))
            proposals_added += 1
            break  # one per freelancer per org

print(f'  Added {proposals_added} cross-proposals')

# 14c) Threads: every pair (freelancer↔enterprise, freelancer↔admin, admin↔enterprise)
existing_pair = set()
for t in db.query(ChatThread).all():
    parts = {tp.user_id for tp in t.participants}
    if len(parts) == 2:
        existing_pair.add(frozenset(parts))

threads_added = 0
for ent_email in ENTERPRISES:
    for fl_email in FREELANCERS:
        key = frozenset({USERS[ent_email], USERS[fl_email]})
        if key in existing_pair:
            continue
        t = ChatThread(id=str(uuid.uuid4()), job_id=None)
        db.add(t)
        db.flush()
        db.add(ThreadParticipant(thread_id=t.id, user_id=USERS[ent_email]))
        db.add(ThreadParticipant(thread_id=t.id, user_id=USERS[fl_email]))
        for sender_id, text, days in [
            (USERS[fl_email], f'Chào {ent_email.split("@")[0]}, em vừa apply cho job trên. Em muốn hỏi timeline cụ thể ạ.', 7),
            (USERS[ent_email], f'Chào {fl_email.split("@")[0]}, timeline khoảng 3 tuần, milestone chia 3 phần. Confirm không?', 6),
            (USERS[fl_email], f'Dạ confirm. Em sẽ gửi milestone breakdown chi tiết trong proposal.', 5),
            (USERS[ent_email], f'Bạn có portfolio tương tự không? Gửi mình xem.', 4),
            (USERS[fl_email], f'Có ạ, em gửi 2 dự án gần đây. Bạn xem rồi feedback nhé.', 3),
            (USERS[ent_email], f'Portfolio đẹp. Tuần sau mình họp team rồi phản hồi cuối.', 2),
        ]:
            db.add(ChatMessage(
                id=str(uuid.uuid4()),
                thread_id=t.id,
                sender_id=sender_id,
                content_text=text,
                created_at=now() - timedelta(days=days),
            ))
        threads_added += 1

# freelancer ↔ admin threads
for fl_email in FREELANCERS:
    for adm_email in ['admin@demo.vn', 'admin@demo.com']:
        key = frozenset({USERS[fl_email], USERS[adm_email]})
        if key in existing_pair:
            continue
        t = ChatThread(id=str(uuid.uuid4()), job_id=None)
        db.add(t)
        db.flush()
        db.add(ThreadParticipant(thread_id=t.id, user_id=USERS[fl_email]))
        db.add(ThreadParticipant(thread_id=t.id, user_id=USERS[adm_email]))
        for sender_id, text, days in [
            (USERS[fl_email], 'Chào admin, em vừa nộp hồ sơ xác minh. Khi nào duyệt vậy ạ?', 5),
            (USERS[adm_email], 'Chào bạn, mình đang xem. Trong 2 ngày sẽ phản hồi nhé.', 4),
            (USERS[fl_email], 'Em chờ ạ. Portfolio thế nào là đạt?', 3),
            (USERS[adm_email], 'Portfolio có link demo + mô tả kỹ thuật rõ ràng là đủ.', 2),
        ]:
            db.add(ChatMessage(
                id=str(uuid.uuid4()),
                thread_id=t.id,
                sender_id=sender_id,
                content_text=text,
                created_at=now() - timedelta(days=days),
            ))
        threads_added += 1

# admin ↔ business threads
for adm_email in ['admin@demo.vn', 'admin@demo.com']:
    for ent_email in ENTERPRISES:
        key = frozenset({USERS[adm_email], USERS[ent_email]})
        if key in existing_pair:
            continue
        t = ChatThread(id=str(uuid.uuid4()), job_id=None)
        db.add(t)
        db.flush()
        db.add(ThreadParticipant(thread_id=t.id, user_id=USERS[adm_email]))
        db.add(ThreadParticipant(thread_id=t.id, user_id=USERS[ent_email]))
        for sender_id, text, days in [
            (USERS[ent_email], 'Chào admin, bên mình vừa mở milestone 5 triệu. Cần lưu ý gì không?', 6),
            (USERS[adm_email], 'Milestone đã fund. Lưu ý duyệt kỹ deliverable trước khi approve.', 5),
            (USERS[ent_email], 'Có tip gì để review nhanh không admin?', 4),
            (USERS[adm_email], 'Dùng checklist: scope đúng brief, code/test đầy đủ, demo 1 click.', 3),
        ]:
            db.add(ChatMessage(
                id=str(uuid.uuid4()),
                thread_id=t.id,
                sender_id=sender_id,
                content_text=text,
                created_at=now() - timedelta(days=days),
            ))
        threads_added += 1

print(f'  Added {threads_added} cross-threads')

# 14d) Cross-notifications: every user sees activity from multiple others
existing_titles_per_user = {}
for u_obj in db.query(User).all():
    existing_titles_per_user.setdefault(u_obj.id, set())
    for n in db.query(Notification).filter(Notification.user_id == u_obj.id):
        existing_titles_per_user[u_obj.id].add(n.title)

NOTIF_TEMPLATES = [
    (NotificationType.MESSAGE_RECEIVED,   lambda u2: f'Tin nhắn mới từ {u2.email.split("@")[0]}', 'Bạn có tin nhắn mới.'),
    (NotificationType.JOB_INVITE,         lambda u2: f'{u2.email.split("@")[0]} đã nộp đơn', 'Một freelancer vừa nộp đơn.'),
    (NotificationType.SYSTEM,             lambda u2: f'{u2.email.split("@")[0]} chấp nhận đơn', 'Đơn của bạn đã được chấp nhận.'),
    (NotificationType.SYSTEM,             lambda u2: f'{u2.email.split("@")[0]} nộp milestone', 'Freelancer vừa nộp deliverable.'),
    (NotificationType.SYSTEM,             lambda u2: f'Cập nhật từ {u2.email.split("@")[0]}', 'Có hoạt động mới.'),
]

notif_added = 0
for target_email in ALL_USERS:
    target_id = USERS[target_email]
    target_user = db.query(User).filter(User.id == target_id).first()
    needed = 5 - db.query(Notification).filter(Notification.user_id == target_id).count()
    if needed <= 0:
        continue
    others = [v for k, v in USERS.items() if k != target_email]
    for i in range(needed):
        other_id = others[i % len(others)]
        other_user = db.query(User).filter(User.id == other_id).first()
        ntype, title_fn, msg = NOTIF_TEMPLATES[i % len(NOTIF_TEMPLATES)]
        title = title_fn(other_user)
        if title in existing_titles_per_user.get(target_id, set()):
            continue
        db.add(Notification(
            id=str(uuid.uuid4()),
            user_id=target_id,
            type=ntype,
            title=title,
            message=msg,
            is_read=False,
            created_at=now() - timedelta(hours=i*6),
        ))
        notif_added += 1

print(f'  Added {notif_added} cross-notifications')

# 14e) Cross-contracts: turn andepzai2 pending proposals into contracts
a2_proposals = db.query(Proposal).filter(
    Proposal.job_id.in_(db.query(Job.id).filter(Job.organization_id == org_a2.id))
).all()
ctr_added = 0
for i, p in enumerate(a2_proposals[:5]):
    if db.query(Contract).filter(Contract.proposal_id == p.id).first():
        continue
    if not db.query(FrelancerProfile).filter(FrelancerProfile.user_id == p.freelancer_id).first():
        continue
    total = float(p.bid_amount)
    c = Contract(
        id=str(uuid.uuid4()),
        proposal_id=p.id,
        job_id=p.job_id,
        organization_id=org_a2.id,
        freelancer_id=p.freelancer_id,
        total_amount=total,
        currency='VND',
        status=ContractStatus.active if i < 2 else ContractStatus.draft,
        terms_snapshot={'milestones': 3, 'payment': 'escrow'},
        started_at=now() - timedelta(days=15-i*2) if i < 2 else None,
        created_at=now() - timedelta(days=18-i*2),
    )
    db.add(c)
    db.flush()
    for m_i in range(3):
        db.add(Milestone(
            id=str(uuid.uuid4()),
            contract_id=c.id,
            sequence_no=m_i + 1,
            title=f'Milestone {m_i+1}: ' + ['Research + Planning', 'Design + Implementation', 'Final delivery'][m_i],
            description='Chi tiết milestone được thống nhất trong proposal.',
            amount=total / 3,
            status=MilestoneStatus.funded if (c.status.value == 'active' and m_i < 2) else MilestoneStatus.draft,
            due_at=now() + timedelta(days=14*(m_i+1)),
        ))
    p.status = ProposalStatus.ACCEPTED
    ctr_added += 1

print(f'  Added {ctr_added} contracts from andepzai2 proposals')

# 14f) Cross-transactions: every wallet has at least 5
tx_added = 0
for u_email in ALL_USERS:
    w = db.query(Wallet).filter(Wallet.user_id == USERS[u_email]).first()
    if not w:
        continue
    existing_tx = db.query(Transaction).filter(Transaction.wallet_id == w.id).count()
    needed = 5 - existing_tx
    if needed <= 0:
        continue
    for i in range(needed):
        if 'admin' in u_email:
            tx_type = 'PAYMENT_SENT' if i % 2 == 0 else 'DEPOSIT'
            amount = 1000000 + 500000 * i
        else:
            r = i % 3
            if r == 0:
                tx_type = 'DEPOSIT'
            elif r == 1:
                tx_type = 'PAYMENT_RECEIVED' if u_email.endswith('.vn') or 'business' in u_email else 'PAYMENT_SENT'
            else:
                tx_type = 'ESCROW_RELEASE'
            amount = 500000 + 100000 * i
            if u_email == 'an.nguyen@example.vn':
                amount = amount / 25000  # VND scale
        if w.currency == 'VND' and u_email != 'an.nguyen@example.vn':
            amount = amount * 25000  # convert to VND
        db.add(Transaction(
            id=str(uuid.uuid4()),
            wallet_id=w.id,
            transaction_type=tx_type,
            amount=amount,
            reference_id=str(uuid.uuid4()),
            status='COMPLETED',
            created_at=now() - timedelta(days=5-i),
        ))
        tx_added += 1

print(f'  Added {tx_added} cross-transactions')


# ─────────────────────────────────────────────────────────────────
# STEP 13: ADMIN ENRICHMENT — notifications, verifications, disputes, threads
# ─────────────────────────────────────────────────────────────────
print('=' * 70)
print('STEP 13: ADMIN ENRICHMENT — extra data for admin demo accounts')
print('=' * 70)

from app.models.verifications import VerificationCase, VerificationCaseStatusEnum, VerificationDecision, VerificationDecisionActionEnum
from app.models.cv_documents import CVDocument
from app.models.disputes import DisputeEvidence
from app.models.chat_threads import ChatThread
from app.models.thread_participants import ThreadParticipant
from app.models.chat_messages import ChatMessage
from app.models.finance import EscrowAccount

# 13a) Admin@demo.vn additional notifications
a_uid = USERS['admin@demo.vn']
ADMIN_NOTIF_PLAN = [
    (NotificationType.SYSTEM, '5 dispute mới cần xử lý', 'Có 5 dispute được mở trong tuần qua, cần admin review.', False, 1),
    (NotificationType.SYSTEM, 'Báo cáo tháng', '12 freelancer mới, 8 verification pending, 3 dispute OPEN.', True, 3),
    (NotificationType.SYSTEM, 'Hồ sơ cần xác minh', 'Freelancer Hoàng Lê vừa upload CV mới.', False, 2),
    (NotificationType.CV_VERIFIED, 'CV cần review', 'Mai upload 3 portfolio, cần verify trong 48h.', False, 4),
    (NotificationType.VERIFICATION_APPROVED, 'Phân công dispute', 'Dispute #d1 quality OPEN được assign cho bạn.', True, 5),
    (NotificationType.VERIFICATION_REJECTED, 'Escalation', 'Dispute #d4 payment escalated to senior admin.', False, 6),
    (NotificationType.SYSTEM, 'Reminder: weekly review', '2 verification case > 3 ngày chưa review.', False, 0),
]

existing_titles = {n.title for n in db.query(Notification).filter(Notification.user_id == a_uid).all()}
for ntype, title, msg, is_read, days in ADMIN_NOTIF_PLAN:
    if title in existing_titles:
        continue
    n = Notification(
        id=str(uuid.uuid4()),
        user_id=a_uid,
        type=ntype,
        title=title,
        message=msg,
        is_read=is_read,
        created_at=now() - timedelta(days=days),
    )
    db.add(n)

# 13b) Verification cases
VERIF_PLAN = [
    ('chat@gmail.com',         VerificationCaseStatusEnum.PENDING, 'ID upload', 5, 'CMND mặt trước + sau'),
    ('hoanglee1605@gmail.com', VerificationCaseStatusEnum.PENDING, 'Portfolio', 3, '3 portfolio links'),
    ('andepzai@gmail.com',     VerificationCaseStatusEnum.PENDING, 'Education', 7, 'Bằng đại học + transcript'),
    ('andepzai2@gmail.com',    VerificationCaseStatusEnum.NEEDS_MORE_INFO, 'Business license', 4, 'Giấy phép kinh doanh mờ'),
    ('admin@demo.com',         VerificationCaseStatusEnum.PENDING, 'Identity check', 2, 'CMND + selfie'),
    ('chat@gmail.com',         VerificationCaseStatusEnum.VERIFIED, 'Final approval', 10, 'All docs verified'),
]
existing_verifs = {(v.freelancer_id, v.status) for v in db.query(VerificationCase).all()}
for email, status, reason, days, evidence in VERIF_PLAN:
    uid = USERS[email]
    if (uid, status) in existing_verifs:
        continue
    cv = db.query(CVDocument).filter(CVDocument.freelancer_id == uid).first() or db.query(CVDocument).first()
    vc = VerificationCase(
        id=str(uuid.uuid4()),
        cv_document_id=cv.id,
        freelancer_id=uid,
        status=status,
        submitted_at=now - timedelta(days=days),
        reviewed_at=now() - timedelta(days=days-1) if status == VerificationCaseStatusEnum.VERIFIED else None,
        reviewed_by_admin_id=a_uid,
        notes=f'Verification for {email}: {reason}',
    )
    db.add(vc)
    db.flush()
    if status == VerificationCaseStatusEnum.VERIFIED:
        db.add(VerificationDecision(
            id=str(uuid.uuid4()),
            verification_case_id=vc.id,
            admin_id=a_uid,
            action=VerificationDecisionActionEnum.VERIFY,
            reason=f'All docs verified: {evidence}',
        ))
    elif status == VerificationCaseStatusEnum.NEEDS_MORE_INFO:
        db.add(VerificationDecision(
            id=str(uuid.uuid4()),
            verification_case_id=vc.id,
            admin_id=a_uid,
            action=VerificationDecisionActionEnum.REQUEST_MORE_INFO,
            reason=f'Cần bổ sung: {evidence}',
        ))

# 13c) Extra disputes — for contracts without disputes
contracts_no_dispute = [c for c in db.query(Contract).all()
                       if db.query(Dispute).filter(Dispute.contract_id == c.id).count() == 0]
DISPUTE_PLAN_EXTRA = [
    ('quality', DisputeSeverity.medium, DisputeStatus.OPEN,
     'Freelancer giao sản phẩm thiếu tính năng đã thỏa thuận. Yêu cầu bổ sung hoặc hoàn 50%.', 2),
    ('payment', DisputeSeverity.high, DisputeStatus.UNDER_REVIEW,
     'Client thanh toán trễ 14 ngày so với milestone approved.', 5),
    ('delivery', DisputeSeverity.low, DisputeStatus.RESOLVED_FREELANCER,
     'Client nói freelancer giao trễ 1 ngày. Admin xác nhận đúng hạn.', 12),
    ('conduct', DisputeSeverity.medium, DisputeStatus.MUTUAL_AGREEMENT,
     'Tranh chấp thái độ làm việc. Hai bên thống nhất chấm dứt.', 18),
]

biz_emails = ['business@demo.vn', 'business@example.com']
fl_emails = ['an.nguyen@example.vn', 'chat@gmail.com', 'hoanglee1605@gmail.com']
admin_emails = ['admin@demo.vn', 'admin@demo.com']

for i, (reason, severity, status, desc, days) in enumerate(DISPUTE_PLAN_EXTRA):
    if i >= len(contracts_no_dispute):
        break
    contract = contracts_no_dispute[i]
    opener_email = fl_emails[i % len(fl_emails)] if i % 2 == 0 else biz_emails[i % len(biz_emails)]
    admin_email = admin_emails[i % 2]
    d = Dispute(
        id=str(uuid.uuid4()),
        contract_id=contract.id,
        opened_by=USERS[opener_email],
        reason_code=DisputeReasonCode(reason),
        description=desc,
        severity=severity,
        status=status,
        assigned_to=USERS[admin_email],
        assigned_at=now() - timedelta(days=days),
        resolved_at=now() - timedelta(days=days-1) if 'RESOLVED' in status.value or 'MUTUAL' in status.value else None,
        resolution_notes='Admin đã review evidence và ra phán quyết.' if 'RESOLVED' in status.value or 'MUTUAL' in status.value else None,
        created_at=now() - timedelta(days=days),
    )
    db.add(d)
    db.flush()
    db.add(DisputeEvidence(
        id=str(uuid.uuid4()),
        dispute_id=d.id,
        submitter_id=USERS[opener_email],
        evidence_text=f'Screenshot + logs đính kèm. Mô tả chi tiết sự việc liên quan đến {reason}.',
        submitted_at=now() - timedelta(days=days),
    ))
    if status == DisputeStatus.RESOLVED_FREELANCER or status == DisputeStatus.MUTUAL_AGREEMENT:
        counter_email = biz_emails[i % len(biz_emails)] if opener_email in fl_emails else fl_emails[i % len(fl_emails)]
        db.add(DisputeEvidence(
            id=str(uuid.uuid4()),
            dispute_id=d.id,
            submitter_id=USERS[counter_email],
            evidence_text=f'Phản hồi từ phía bên kia.',
            submitted_at=now() - timedelta(days=days-1),
        ))

# 13d) Extra threads for admin@demo.com
admin_com = USERS['admin@demo.com']
for email in ['andepzai2@gmail.com', 'freelancer@example.com']:
    uid = USERS[email]
    existing = any({tp.user_id for tp in t.participants} == {admin_com, uid}
                   for t in db.query(ChatThread).all())
    if existing:
        continue
    t = ChatThread(id=str(uuid.uuid4()), job_id=None)
    db.add(t)
    db.flush()
    db.add(ThreadParticipant(thread_id=t.id, user_id=admin_com))
    db.add(ThreadParticipant(thread_id=t.id, user_id=uid))
    db.flush()
    for sender_id, text, days in [
        (uid, 'Chào admin, em cần hỗ trợ về việc upload hồ sơ xác minh.', 4),
        (admin_com, 'Chào bạn, mình sẽ guide bạn từng bước.', 3),
        (uid, 'Em làm theo rồi nhưng bước upload ảnh bị lỗi.', 2),
        (admin_com, 'Bạn thử refresh và upload lại ảnh PNG/JPG < 5MB.', 1),
        (uid, 'Ok em làm được rồi, cảm ơn admin!', 0),
    ]:
        m = ChatMessage(
            id=str(uuid.uuid4()),
            thread_id=t.id,
            sender_id=sender_id,
            content_text=text,
            created_at=now() - timedelta(days=days),
        )
        db.add(m)

# 13e) Escrow accounts for active contracts
active_contracts = db.query(Contract).filter(Contract.status == ContractStatus.active).all()
for c in active_contracts:
    if db.query(EscrowAccount).filter(EscrowAccount.contract_id == c.id).first():
        continue
    biz = db.query(Organization).filter(Organization.id == c.organization_id).first()
    if not biz:
        continue
    biz_wallet = db.query(Wallet).filter(Wallet.user_id == biz.owner_user_id).first()
    if not biz_wallet:
        continue
    db.add(EscrowAccount(
        id=str(uuid.uuid4()),
        contract_id=c.id,
        wallet_id=biz_wallet.id,
        amount=c.total_amount,
    ))


# ─────────────────────────────────────────────────────────────────
db.commit()
print()
print('=' * 70)
print('STEP 15: FILL HOLES — ensure every account has data on every page')
print('=' * 70)

from app.models.interviews import Interview, InterviewStatus
from app.models.contact_info_exchanges import ContactInfoExchange, ExchangeStatus, ContactPattern

# Ensure every demo user has ≥2 interviews
INTERVIEW_TARGETS = ['an.nguyen@example.vn', 'chat@gmail.com', 'hoanglee1605@gmail.com',
                     'andepzai@gmail.com', 'freelancer@example.com']

# Build enterprise interview list (org -> first 3 freelancer profiles)
def get_fl_profile_id(uid):
    p = db.query(FrelancerProfile).filter(FrelancerProfile.user_id == uid).first()
    return p.user_id if p else uid

# 15a) Make sure each freelancer has ≥2 interviews
iv_added = 0
for fl_email in INTERVIEW_TARGETS:
    fl_id = USERS[fl_email]
    fl_prof_id = get_fl_profile_id(fl_id)
    # Find proposals for this freelancer
    props = db.query(Proposal).filter(Proposal.freelancer_id == fl_prof_id).all()
    existing = len([p for p in props if db.query(Interview).filter(Interview.proposal_id == p.id).count() > 0])
    if existing >= 2:
        continue
    needed = 2 - existing
    for i, prop in enumerate(props[:max(needed*2, 4)]):
        # Find org via proposal's job
        job = db.query(Job).filter(Job.id == prop.job_id).first()
        if not job:
            continue
        # Skip if interview already
        if db.query(Interview).filter(Interview.proposal_id == prop.id).first():
            continue
        if existing >= 2:
            break
        offset = 3 + i
        statuses = [InterviewStatus.SCHEDULED, InterviewStatus.CONFIRMED, InterviewStatus.COMPLETED]
        iv = Interview(
            id=str(uuid.uuid4()),
            proposal_id=prop.id,
            organization_id=job.organization_id,
            interview_type='Video call',
            start_time=now() + timedelta(days=offset),
            duration_minutes=45,
            platform='Google Meet',
            meet_link=f'https://meet.google.com/abc-{uuid.uuid4().hex[:3]}-{uuid.uuid4().hex[:4]}',
            note=f'Interview cho vị trí {job.title[:30]}. Chuẩn bị portfolio + demo 1 dự án tương tự.',
            status=statuses[i % len(statuses)],
            created_at=now() - timedelta(days=5-i),
        )
        db.add(iv)
        existing += 1
        iv_added += 1

print(f'  Added {iv_added} interviews')

# 15b) Ensure every account has ≥2 disputes via contracts
DISPUTE_TARGETS = ['andepzai@gmail.com', 'freelancer@example.com',
                   'business@example.com', 'andepzai2@gmail.com']

dispute_added = 0
for email in DISPUTE_TARGETS:
    u = db.query(User).filter(User.email == email).first()
    if not u:
        continue
    # Find their contracts
    if u.role.value == 'enterprise':
        org = db.query(Organization).filter(Organization.owner_user_id == u.id).first()
        if not org:
            continue
        contracts = db.query(Contract).filter(Contract.organization_id == org.id).all()
    else:
        fl_prof_id = get_fl_profile_id(u.id)
        contracts = db.query(Contract).filter(Contract.freelancer_id == fl_prof_id).all()

    # Count existing disputes on these contracts
    contract_ids = [c.id for c in contracts]
    existing_disp = db.query(Dispute).filter(Dispute.contract_id.in_(contract_ids)).count() if contract_ids else 0
    if existing_disp >= 2:
        continue
    needed = 2 - existing_disp
    if needed <= 0 or not contracts:
        continue
    DISPUTE_TEMPLATES = [
        (DisputeReasonCode.delivery, DisputeSeverity.medium, DisputeStatus.OPEN,
         'Freelancer giao trễ deadline 3 ngày, scope chưa đủ so với proposal.',
         'Quality sản phẩm chưa đạt yêu cầu, cần chỉnh sửa thêm 1-2 round.'),
        (DisputeReasonCode.payment, DisputeSeverity.high, DisputeStatus.UNDER_REVIEW,
         'Milestone 2 đã approved nhưng chưa nhận được thanh toán sau 14 ngày.',
         'Đã gửi nhắc 3 lần. Cần admin hỗ trợ release escrow.'),
        (DisputeReasonCode.conduct, DisputeSeverity.low, DisputeStatus.MUTUAL_AGREEMENT,
         'Bên A yêu cầu làm ngoài scope nhiều lần, không trả thêm.',
         'Đã thỏa thuận bù thêm 20% và hoàn thành dự án.'),
        (DisputeReasonCode.quality, DisputeSeverity.high, DisputeStatus.OPEN,
         'Code thiếu test coverage, không match convention. Refactor lại toàn bộ.',
         'Cần viết thêm unit test + integration test cho core module.'),
    ]
    cnt = 0
    for i, c in enumerate(contracts):
        if cnt >= needed:
            break
        # Find a counterparty (the other side)
        if u.role.value == 'enterprise':
            counterparty_id = c.freelancer_id
        else:
            org_c = db.query(Organization).filter(Organization.id == c.organization_id).first()
            counterparty_id = org_c.owner_user_id if org_c else USERS['admin@demo.vn']

        reason_code, sev, status, desc, msg = DISPUTE_TEMPLATES[i % len(DISPUTE_TEMPLATES)]
        opened_by = u.id

        # Find a milestone for this contract
        ms = db.query(Milestone).filter(Milestone.contract_id == c.id).first()
        d = Dispute(
            id=str(uuid.uuid4()),
            contract_id=c.id,
            milestone_id=ms.id if ms else None,
            opened_by=opened_by,
            assigned_to=counterparty_id,
            reason_code=reason_code,
            severity=sev,
            status=status,
            description=desc,
            created_at=now() - timedelta(days=12-i*3),
        )
        db.add(d)
        db.flush()
        db.add(DisputeEvidence(
            id=str(uuid.uuid4()),
            dispute_id=d.id,
            submitter_id=u.id,
            evidence_text=msg,
            file_urls=[],
            submitted_at=now() - timedelta(days=11-i*3),
        ))
        cnt += 1
        dispute_added += 1

print(f'  Added {dispute_added} disputes')

# 15c) Ensure admin sees ≥3 contact exchanges
existing_ex = db.query(ContactInfoExchange).count()
ex_added = 0
if existing_ex < 5:
    # Find any active threads with messages
    threads_with_msgs = (db.query(ChatThread).filter(
        ChatThread.id.in_(db.query(ChatMessage.thread_id).distinct().subquery())
    ).all())
    for i, t in enumerate(threads_with_msgs[:8]):
        # Get a message from this thread
        msg = db.query(ChatMessage).filter(ChatMessage.thread_id == t.id).order_by(ChatMessage.created_at.desc()).first()
        if not msg:
            continue
        if db.query(ContactInfoExchange).filter(ContactInfoExchange.message_id == msg.id).first():
            continue
        patterns = [
            (ContactPattern.PHONE_VN, 'Anh ơi gọi em qua số 0987654321 nhé, ngoài giờ làm việc.'),
            (ContactPattern.EMAIL, 'Bạn gửi chi tiết qua email minh@gmail.com giúp mình.'),
            (ContactPattern.SOCIAL_LINK, 'Add Zalo em: zalo.me/tenminh hoặc fb.com/tenminh'),
        ]
        statuses = [ExchangeStatus.PENDING, ExchangeStatus.APPROVED, ExchangeStatus.FLAGGED]
        pattern, content = patterns[i % len(patterns)]
        status = statuses[i % len(statuses)]
        ce = ContactInfoExchange(
            id=str(uuid.uuid4()),
            thread_id=t.id,
            sender_id=msg.sender_id,
            pattern_type=pattern,
            raw_content=content,
            message_id=msg.id,
            status=status,
            reviewed_by=(USERS['admin@demo.vn'] if status != ExchangeStatus.PENDING else None),
            reviewed_at=(now() - timedelta(days=i) if status != ExchangeStatus.PENDING else None),
            bypass_reason=('Số điện thoại hợp lệ sau ký hợp đồng' if status == ExchangeStatus.APPROVED else None),
            created_at=now() - timedelta(days=8-i),
        )
        db.add(ce)
        ex_added += 1

db.commit()
print(f'  Added {ex_added} contact exchanges (was {existing_ex})')

print()
print('=' * 70)
print('FINAL TOTALS')
print('=' * 70)
features = {
    'Jobs':          Job,
    'Proposals':     Proposal,
    'Contracts':     Contract,
    'Milestones':    Milestone,
    'Deliverables':  Deliverable,
    'Ratings':       Rating,
    'ChatThreads':   ChatThread,
    'ChatMessages':  ChatMessage,
    'Notifications': Notification,
    'Disputes':      Dispute,
    'Wallets':       Wallet,
    'Transactions':  Transaction,
    'Verifications': VerificationCase,
    'EscrowAccounts': EscrowAccount,
}
all_ok = True
for name, model in features.items():
    n = db.query(model).count()
    flag = 'OK' if n >= 3 else 'FAIL <3'
    if n < 3:
        all_ok = False
    print(f'  {name:20} {n:5} [{flag}]')
print()
print(f'ALL >=3: {all_ok}')