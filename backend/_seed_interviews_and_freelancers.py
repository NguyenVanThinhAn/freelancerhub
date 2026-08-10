"""
_seed_interviews_and_freelancers.py — Cập nhật vị trí freelancer + tạo interviews.

1. Cập nhật display_name, headline, bio, experience_years, hourly_rate
   cho 4 freelancer có data placeholder / typo:
   - an.nguyen@example.vn (Nguyễn Văn An) — đã có data OK
   - andepzai@gmail.com (an) — placeholder
   - chat@gmail.com (an) — placeholder
   - freelancer@example.com (Test Freelancer) — placeholder
   - hoanglee1605@gmail.com (Lê Vũ Hoàng) — typo "Stak holder, requiment"

2. Đảm bảo mỗi freelancer có skill + availability_status OK.

3. Tạo ~6 interviews:
   - 1 SCHEDULED sắp tới (freelancer có thể Confirm/Decline)
   - 1 CONFIRMED (freelancer đã accept)
   - 1 COMPLETED (đã phỏng vấn xong)
   - 1 CANCELED (business huỷ)
   - 1 SCHEDULED khác (test multi interview)
   - 1 DECLINED (freelancer từ chối)

Idempotent: skip nếu đã đủ.
"""
import sys
import uuid
import random
from datetime import datetime, timezone, timedelta

sys.path.insert(0, '.')

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DB_PATH = 'freelancerhub.db'
DATABASE_URL = f'sqlite:///{DB_PATH}'

from app.database import Base  # noqa: E402
import app.models  # noqa: F401, E402

engine = create_engine(DATABASE_URL, echo=False, connect_args={'check_same_thread': False})
Session = sessionmaker(bind=engine)


# ─── 1. Update freelancer profiles ─────────────────────────────────────────────
FREELANCER_PROFILES = [
    {
        'email': 'an.nguyen@example.vn',
        'display_name': 'Nguyễn Văn An',
        'headline': 'Senior Fullstack Developer (React/Node.js) — 5 năm',
        'bio': 'Fullstack 5+ năm KN với React, Node.js, TypeScript, PostgreSQL. Đã ship 20+ sản phẩm B2B cho SME Việt Nam và Nhật.',
        'experience_years': 5.0,
        'hourly_rate': 250000,
        'availability_status': 'limited',  # có 1 interview CONFIRMED
        'skill_names': ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker'],
    },
    {
        'email': 'hoanglee1605@gmail.com',
        'display_name': 'Lê Vũ Hoàng',
        'headline': 'Backend Engineer (Python/Go) — 4 năm, microservices & fintech',
        'bio': 'Backend engineer 4 năm KN với Python (FastAPI/Django), Go, PostgreSQL, Redis, Docker. Từng lead backend cho fintech scale 100K users.',
        'experience_years': 4.0,
        'hourly_rate': 280000,
        'availability_status': 'available',
        'skill_names': ['Python', 'PostgreSQL', 'Docker', 'Go', 'Redis'],
    },
    {
        'email': 'andepzai@gmail.com',
        'display_name': 'Trần Minh Quân',
        'headline': 'Frontend Developer (React/Next.js) — 3 năm',
        'bio': 'Frontend 3 năm KN React, Next.js 14, TypeScript, TailwindCSS. Thiết kế responsive + animation. Portfolio: ecommerce, SaaS dashboard, booking engine.',
        'experience_years': 3.0,
        'hourly_rate': 200000,
        'availability_status': 'available',
        'skill_names': ['React', 'TypeScript', 'JavaScript'],
    },
    {
        'email': 'chat@gmail.com',
        'display_name': 'Phạm Thị Mai',
        'headline': 'UI/UX Designer + Motion Graphics — 3 năm',
        'bio': 'UI/UX designer 3 năm KN Figma, design system, prototype. Thêm kinh nghiệm motion graphics After Effects, Lottie. Đã ship 15+ brand identity.',
        'experience_years': 3.0,
        'hourly_rate': 180000,
        'availability_status': 'available',
        'skill_names': [],
    },
    {
        'email': 'freelancer@example.com',
        'display_name': 'Đặng Văn Hùng',
        'headline': 'Mobile Developer (Flutter/React Native) — 4 năm',
        'bio': 'Mobile dev 4 năm KN Flutter 3.x, React Native. 2 app đã publish trên App Store/Play Store (200K+ downloads). Tích hợp payment, push, analytics.',
        'experience_years': 4.0,
        'hourly_rate': 220000,
        'availability_status': 'available',
        'skill_names': ['Flutter', 'React Native', 'Kotlin', 'Swift'],
    },
]


def update_freelancer_profiles(session):
    from app.models.users import User
    from app.models.freelancers import FrelancerProfile
    from app.models.freelancer_skills import FreelancerSkill
    from app.models.skills import Skill

    skills_by_name = {s.name: s.id for s in session.query(Skill).all()}

    for prof_data in FREELANCER_PROFILES:
        user = session.query(User).filter(User.email == prof_data['email']).first()
        if not user:
            print(f'  ! user {prof_data["email"]} không tồn tại')
            continue

        profile = session.query(FrelancerProfile).filter(FrelancerProfile.user_id == user.id).first()
        if not profile:
            profile = FrelancerProfile(user_id=user.id)
            session.add(profile)

        profile.display_name = prof_data['display_name']
        profile.headline = prof_data['headline']
        profile.bio = prof_data['bio']
        profile.experience_years = prof_data['experience_years']
        profile.hourly_rate = prof_data['hourly_rate']
        profile.availability_status = prof_data['availability_status']
        # Recompute profile_completion: name + headline + bio + skills + experience + rate
        session.flush()
        skill_count = session.query(FreelancerSkill).filter(FreelancerSkill.freelancer_profile_id == user.id).count()
        completion = 30 if profile.display_name else 0
        if profile.headline:
            completion += 15
        if profile.bio:
            completion += 15
        if profile.experience_years and profile.experience_years > 0:
            completion += 15
        if profile.hourly_rate:
            completion += 10
        if skill_count >= 3:
            completion += 15
        profile.profile_completion = min(100, completion)

        # Replace skills (sync with skill_names)
        session.query(FreelancerSkill).filter(FreelancerSkill.freelancer_profile_id == user.id).delete()
        for sk_name in prof_data['skill_names']:
            sk_id = skills_by_name.get(sk_name)
            if sk_id:
                session.add(FreelancerSkill(freelancer_profile_id=user.id, skill_id=sk_id))
        print(f'  + updated {user.email:30s} | "{profile.display_name}" | {profile.headline[:60]}')

    session.commit()


# ─── 2. Seed interviews ────────────────────────────────────────────────────────
def seed_interviews(session):
    from app.models.interviews import Interview, InterviewStatus
    from app.models.proposals import Proposal
    from app.models.jobs import Job
    from app.models.organizations import Organization

    # Check existing
    if session.query(Interview).count() >= 6:
        print('  ~ đã có >= 6 interviews, skip')
        return 0

    # Pick ACCEPTED proposals (đã được duyệt → sẽ có interview)
    accepted_proposals = session.query(Proposal).filter(Proposal.status == 'ACCEPTED').all()
    if len(accepted_proposals) < 6:
        print(f'  ! chỉ có {len(accepted_proposals)} ACCEPTED proposals, cần >= 6 để seed 6 interviews')
        # Vẫn tạo, dùng cả PENDING nếu thiếu
        accepted_proposals = session.query(Proposal).all()

    # Diverse statuses
    now = datetime.now(timezone.utc)
    interview_specs = [
        # (status, days_from_now, type, platform, duration, meet_link_suffix)
        (InterviewStatus.SCHEDULED, +3, 'Video call', 'Google Meet', 60, 'abc-defg-hij'),
        (InterviewStatus.CONFIRMED, +5, 'Video call', 'Zoom', 45, 'kln-mnop-qrs'),
        (InterviewStatus.COMPLETED, -7, 'Phỏng vấn trực tiếp', 'Offline — FPT Software', 90, None),
        (InterviewStatus.CANCELED, -2, 'Video call', 'Google Meet', 60, 'tuv-wxyz-abc'),
        (InterviewStatus.SCHEDULED, +10, 'Video call', 'Microsoft Teams', 60, 'def-ghij-klm'),
        (InterviewStatus.DECLINED, +1, 'Video call', 'Google Meet', 30, 'nop-qrst-uvw'),
    ]

    added = 0
    for i, (status, days, itype, platform, duration, meet_suffix) in enumerate(interview_specs):
        if i >= len(accepted_proposals):
            break
        proposal = accepted_proposals[i]
        job = session.query(Job).filter(Job.id == proposal.job_id).first()
        if not job:
            continue
        org = session.query(Organization).filter(Organization.id == job.organization_id).first()
        if not org:
            continue

        start = now + timedelta(days=days, hours=random.randint(9, 17))
        meet_link = f'https://meet.google.com/{meet_suffix}' if meet_suffix else None
        note = f'Phỏng vấn vị trí "{job.title[:40]}". Mang theo CV + portfolio.'
        if status == InterviewStatus.CONFIRMED:
            note += '\n[freelancer@confirmed] Đã xác nhận tham dự.'
        elif status == InterviewStatus.DECLINED:
            note += '\n[freelancer@declined] Bận lịch khác, xin phép hẹn lịch khác.'
        elif status == InterviewStatus.CANCELED:
            note += '\n[business@canceled] Lịch họp nội bộ, sẽ sắp xếp lại sau.'

        interview = Interview(
            id=str(uuid.uuid4()),
            proposal_id=proposal.id,
            organization_id=org.id,
            interview_type=itype,
            start_time=start,
            duration_minutes=duration,
            platform=platform,
            meet_link=meet_link,
            note=note,
            status=status,
            created_at=now - timedelta(days=abs(days) + 2),
        )
        session.add(interview)
        session.flush()
        added += 1
        print(f'  + {status.value:10s} {start.strftime("%Y-%m-%d %H:%M")} | {proposal.id[:8]} | {org.name[:25]}')

    session.commit()
    return added


def main():
    session = Session()
    print('=== 1. Update freelancer profiles ===')
    update_freelancer_profiles(session)
    print()
    print('=== 2. Seed interviews ===')
    n = seed_interviews(session)
    print(f'\n=== Done: +{n} interviews ===')

    # Verify
    from app.models.interviews import Interview
    from app.models.freelancers import FrelancerProfile
    print('\n=== SUMMARY ===')
    print(f'  Interviews: {session.query(Interview).count()}')
    for status, count in session.query(Interview.status, session.query(Interview).filter(Interview.status == status).statement.column_descriptions[0]["entity"].__class__) if False else []:
        pass
    from sqlalchemy import func
    for r in session.query(Interview.status, func.count(Interview.id)).group_by(Interview.status).all():
        print(f'    {r[0].value:10s}: {r[1]}')
    print(f'  Freelancer profiles: {session.query(FrelancerProfile).count()}')


if __name__ == '__main__':
    main()