"""
_seed_jobs_per_org.py — Thêm 20 tin tuyển dụng cho từng business org.

Mục đích: Demo data để khi login vào từng doanh nghiệp, mỗi org có đủ
20 jobs để test các flow AI Matching / Interview / Contract.

Chạy: .venv\Scripts\python.exe _seed_jobs_per_org.py
"""
import sys
import uuid
import random
from datetime import datetime, timezone, timedelta

# Add backend to path so we can import app.models
sys.path.insert(0, '.')

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Use the same DB path that database.py falls back to (sqlite:///freelancerhub.db)
DB_PATH = 'freelancerhub.db'
DATABASE_URL = f'sqlite:///{DB_PATH}'

from app.database import Base  # noqa: E402
import app.models  # noqa: F401, E402 — ensure all models registered

engine = create_engine(DATABASE_URL, echo=False, connect_args={'check_same_thread': False})
Session = sessionmaker(bind=engine)

# ─── Templates: 20 tin tuyển dụng đa dạng ngành nghề ───────────────────────────
JOB_TEMPLATES = [
    ("Senior Backend Engineer (Python/Django)", "Tuyển Backend Engineer 5+ năm KN Django/DRF, PostgreSQL, Redis, Docker. Thiết kế microservice cho hệ thống fintech scale 1M users.", "IT - Phần mềm", "FIXED", 25_000_000, 45_000_000, ["Python", "PostgreSQL", "Docker"]),
    ("Frontend Developer (React/Next.js)", "React 18, Next.js 14, TypeScript, TailwindCSS. Xây dashboard enterprise + marketplace.", "IT - Phần mềm", "FIXED", 20_000_000, 35_000_000, ["React", "TypeScript"]),
    ("Mobile Developer (Flutter)", "Phát triển app iOS/Android bằng Flutter 3.x. Tích hợp thanh toán, push notification, analytics.", "IT - Phần mềm", "HOURLY", 250_000, 450_000, ["Flutter", "Dart"]),
    ("DevOps Engineer (AWS/K8s)", "Vận hành cluster K8s trên AWS EKS. CI/CD, monitoring, security. 3+ năm kinh nghiệm.", "IT - Phần mềm", "FIXED", 30_000_000, 50_000_000, ["AWS", "Kubernetes", "Docker"]),
    ("AI/ML Engineer (LLM)", "Fine-tune và deploy LLM (Llama/Mistral). Xây chatbot cho CSKH, RAG pipeline, vector DB.", "IT - Phần mềm", "FIXED", 35_000_000, 60_000_000, ["Python"]),
    ("Data Engineer (Spark/Airflow)", "Xây data pipeline batch/realtime. Spark, Airflow, BigQuery, dbt. Fintech domain.", "IT - Phần mềm", "FIXED", 28_000_000, 48_000_000, ["Python", "PostgreSQL"]),
    ("Full-stack Developer (Node + React)", "Node.js + Express, React 18, PostgreSQL. Làm SaaS B2B cho SME Việt Nam.", "IT - Phần mềm", "HOURLY", 220_000, 380_000, ["Node.js", "React", "JavaScript", "TypeScript", "PostgreSQL"]),
    ("UI/UX Designer (Product)", "Thiết kế mobile/web app B2C. Figma, design system, user research. Fintech/edu-tech.", "Thiết kế đồ hoạ", "FIXED", 18_000_000, 32_000_000, []),
    ("Brand Designer / Illustrator", "Branding cho dự án khởi nghiệp. Logo, identity, illustration. Portfolio bắt buộc.", "Thiết kế đồ hoạ", "FIXED", 12_000_000, 25_000_000, []),
    ("Motion Graphics / After Effects", "Làm video quảng cáo 30s cho app. After Effects, Lottie, animation.", "Thiết kế đồ hoạ", "FIXED", 8_000_000, 18_000_000, []),
    ("Content Marketing Specialist", "Viết bài SEO, quản lý blog/landing page, email marketing. Tiếng Việt native, 2+ năm.", "Marketing", "FIXED", 12_000_000, 20_000_000, []),
    ("Performance Marketing (Google Ads/Meta)", "Chạy ads scale 50K-200K USD/tháng cho e-commerce. ROAS >= 3.", "Marketing", "FIXED", 15_000_000, 28_000_000, []),
    ("Video Editor / Producer (TikTok/Reels)", "Edit video ngắn 15-60s. CapCut, Premiere. Trend TikTok/Reels.", "Marketing", "FIXED", 8_000_000, 15_000_000, []),
    ("Dịch thuật Anh-Việt (Marketing)", "Dịch tài liệu marketing, blog, landing page. 500+ từ/ngày. IT domain.", "Dịch thuật", "FIXED", 5_000_000, 12_000_000, []),
    ("Phiên dịch cabin EN-VI (Hội nghị)", "Phiên dịch cabin cho hội nghị quốc tế. 3+ năm KN, sẵn sàng đi công tác.", "Dịch thuật", "HOURLY", 800_000, 1_500_000, []),
    ("Kế toán trưởng (Fintech)", "Quản lý sổ sách, thuế, báo cáo tài chính cho công ty fintech. ACCA/CPA ưu tiên.", "Kế toán - Tài chính", "FIXED", 20_000_000, 35_000_000, []),
    ("Chuyên viên phân tích tài chính (FP&A)", "Lập budget, forecast, variance analysis cho startup Series A. Excel/Google Sheets expert.", "Kế toán - Tài chính", "FIXED", 18_000_000, 30_000_000, []),
    ("Luật sư tư vấn hợp đồng thương mại", "Soạn/review hợp đồng B2B, NDA, MSA. 3+ năm KN. Luật sư hành nghề hợp lệ.", "Pháp lý", "FIXED", 15_000_000, 28_000_000, []),
    ("Tư vấn pháp lý startup (Equity/SAFE)", "Tư vấn cấu trúc vốn, SAFE, vesting cho startup giai đoạn seed/series A.", "Pháp lý", "HOURLY", 600_000, 1_200_000, []),
    ("Game Developer (Unity 3D)", "Phát triển casual mobile game. Unity 3D, C#. 2+ năm. Đã publish ít nhất 1 game.", "IT - Phần mềm", "FIXED", 22_000_000, 40_000_000, ["C#"]),
]


def ensure_org_for_user(session, user_id: str, user_email: str) -> str:
    """Find or create Organization owned by user_id."""
    from app.models.organizations import Organization
    org = session.query(Organization).filter(Organization.owner_user_id == user_id).first()
    if org:
        return org.id

    # Derive org name from email
    local = user_email.split('@')[0]
    base_name = local.replace('.', ' ').replace('-', ' ').title()
    if base_name.strip().lower() == 'business':
        base_name = f'{base_name} Enterprise'

    slug = (local.replace('.', '-').replace('_', '-') + '-org')[:200]
    # Ensure unique slug
    suffix = 1
    final_slug = slug
    while session.query(Organization).filter(Organization.slug == final_slug).first():
        suffix += 1
        final_slug = f"{slug}-{suffix}"[:200]

    new_org = Organization(
        id=str(uuid.uuid4()),
        name=f'{base_name} JSC',
        slug=final_slug,
        description=f'Tổ chức demo cho user {user_email}',
        industry='Công nghệ',
        website=None,
        tax_code=None,
        verification_status='unverified',
        owner_user_id=user_id,
    )
    session.add(new_org)
    session.commit()
    print(f'  + created Organization "{new_org.name}" (slug={new_org.slug})')
    return new_org.id


def seed_jobs_for_org(session, org_id: str, org_name: str, count: int = 20):
    from app.models.jobs import Job, JobSkill, JobPaymentType, JobStatus
    from app.models.categories import Category
    from app.models.skills import Skill

    # Check existing jobs for this org
    existing = session.query(Job).filter(Job.organization_id == org_id).count()
    if existing >= count:
        print(f'  ~ org "{org_name}" đã có {existing} jobs (>= {count}), skip')
        return 0

    # Load lookup tables
    cats = {c.name: c.id for c in session.query(Category).all()}
    skills_by_name = {s.name: s.id for s in session.query(Skill).all()}

    added = 0
    now = datetime.now(timezone.utc)
    # Pick first N templates; for more than 20, shuffle & repeat with suffix
    templates = JOB_TEMPLATES[:count]
    if count > len(JOB_TEMPLATES):
        extras = random.sample(JOB_TEMPLATES, count - len(JOB_TEMPLATES))
        templates += [(f"{t[0]} (Hợp đồng)", *t[1:]) for t in extras]

    for i, (title, desc, cat_name, payment_type, budget_min, budget_max, skill_names) in enumerate(templates):
        if existing + added >= count:
            break
        cat_id = cats.get(cat_name)
        created = now - timedelta(days=random.randint(1, 45), hours=random.randint(0, 23))
        status = random.choices(
            [JobStatus.OPEN, JobStatus.IN_PROGRESS, JobStatus.COMPLETED, JobStatus.CANCELLED],
            weights=[60, 25, 10, 5],
            k=1,
        )[0]
        job = Job(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            category_id=cat_id,
            title=title,
            description=desc,
            budget_min=float(budget_min),
            budget_max=float(budget_max),
            payment_type=JobPaymentType(payment_type),
            status=status,
            created_at=created,
            updated_at=created,
        )
        session.add(job)
        session.flush()

        # Attach skills
        for sk_name in skill_names:
            sk_id = skills_by_name.get(sk_name)
            if sk_id:
                session.add(JobSkill(job_id=job.id, skill_id=sk_id))

        added += 1
        print(f'  + {status.value:12s} {title[:60]:60s} {budget_min/1_000_000:5.0f}M-{budget_max/1_000_000:5.0f}M')

    session.commit()
    return added


def main():
    from app.models.users import User
    session = Session()

    # 3 enterprise users
    target_users = [
        ('a5715c3b-5d0d-4584-bc58-f927eecae7dd', 'business@demo.vn'),     # Demo Business Co., Ltd (đã có 25 jobs, sẽ skip)
        ('e23c7098-d9ec-4b1e-92ae-919310a7d691', 'andepzai2@gmail.com'),  # andepzai (0 jobs, cần +20)
        ('18babb07-2ab2-48f2-8dc4-19b4e14225b6', 'business@example.com'), # chưa có org (cần tạo + 20 jobs)
    ]

    total_added = 0
    for user_id, email in target_users:
        user = session.query(User).filter(User.id == user_id).first()
        if not user:
            print(f'  ! user {email} không tồn tại, skip')
            continue

        print(f'\n== {email} ({user.role}) ==')
        org_id = ensure_org_for_user(session, user_id, email)

        from app.models.organizations import Organization
        org = session.query(Organization).filter(Organization.id == org_id).first()
        n = seed_jobs_for_org(session, org_id, org.name, count=20)
        total_added += n
        print(f'  => added {n} jobs (total in org: {session.query(__import__("app.models.jobs", fromlist=["Job"]).Job).filter_by(organization_id=org_id).count()})')

    print(f'\n=== TỔNG: +{total_added} jobs ===')

    # Print summary
    from app.models.jobs import Job
    from app.models.organizations import Organization
    print('\n=== SUMMARY sau seed ===')
    for org in session.query(Organization).all():
        njobs = session.query(Job).filter(Job.organization_id == org.id).count()
        owner = session.query(User).filter(User.id == org.owner_user_id).first()
        print(f'  {org.name:30s} ({owner.email if owner else "?"}): {njobs} jobs')


if __name__ == '__main__':
    main()