"""Seed 3 demo accounts: Business / Freelancer / Admin.

Run:
  venv/Scripts/python.exe seed_users.py
"""
import sys
from datetime import datetime, timezone

sys.path.append('.')

from app.database import get_db
from app.models.users import User, UserRole, UserStatus
from app.models.organizations import Organization, VerificationStatus
from app.models.freelancers import FrelancerProfile
from app.core.security import hash_password


def _now() -> datetime:
    return datetime.now(timezone.utc)


def upsert_user(db, email: str, password: str, role: UserRole) -> User:
    user = db.query(User).filter(User.email == email).first()
    pw_hash = hash_password(password)
    if user:
        user.password_hash = pw_hash
        user.role = role
        user.status = UserStatus.active
        user.email_verified_at = _now()
        return user
    user = User(
        email=email,
        password_hash=pw_hash,
        role=role,
        status=UserStatus.active,
        email_verified_at=_now(),
    )
    db.add(user)
    db.flush()
    return user


def upsert_organization(db, owner: User, name: str, slug: str) -> Organization:
    org = (
        db.query(Organization)
        .filter(Organization.owner_user_id == owner.id)
        .first()
    )
    if org:
        return org
    org = Organization(
        name=name,
        slug=slug,
        description=f"Tổ chức demo thuộc {owner.email}",
        industry="Công nghệ thông tin",
        verification_status=VerificationStatus.verified,
        owner_user_id=owner.id,
    )
    db.add(org)
    db.flush()
    return org


def upsert_freelancer_profile(db, user: User, display_name: str) -> FrelancerProfile:
    p = (
        db.query(FrelancerProfile)
        .filter(FrelancerProfile.user_id == user.id)
        .first()
    )
    if p:
        return p
    p = FrelancerProfile(
        user_id=user.id,
        display_name=display_name,
        headline="Senior Fullstack Developer (React/Node.js)",
        bio="Freelancer demo với 5 năm kinh nghiệm phát triển web fullstack.",
        experience_years=5,
        hourly_rate=250000,
        currency="VND",
        availability_status="available",
        profile_completion=80,
    )
    db.add(p)
    db.flush()
    return p


def main() -> None:
    db = next(get_db())
    try:
        business = upsert_user(db, "business@demo.vn", "Business1234!", UserRole.enterprise)
        print(f"[OK] user business: {business.email}")

        freelancer = upsert_user(db, "an.nguyen@example.vn", "Freelancer1234!", UserRole.freelancer)
        print(f"[OK] user freelancer: {freelancer.email}")

        admin = upsert_user(db, "admin@demo.vn", "Admin1234!", UserRole.admin)
        print(f"[OK] user admin: {admin.email}")

        org = upsert_organization(
            db,
            business,
            name="Demo Business Co., Ltd",
            slug="demo-business-co-ltd",
        )
        print(f"[OK] organization: {org.name} (owner={business.email})")

        profile = upsert_freelancer_profile(db, freelancer, display_name="Nguyễn Văn An")
        print(f"[OK] freelancer profile: {profile.display_name}")

        db.commit()
        print("Done seeding demo users.")
    except Exception as exc:
        db.rollback()
        print(f"Seed failed: {exc!r}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()