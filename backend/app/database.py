from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

import os

# Khởi tạo đối tượng Base tập trung duy nhất cho toàn bộ hệ thống
# Tất cả các SQLAlchemy Model (users, freelancers, organizations...) bắt buộc phải kế thừa từ Base này
Base = declarative_base()

import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
default_db_path = os.path.join(BASE_DIR, "freelancerhub.db")
DB_URL = os.environ.get('DB_URL', f"sqlite:///{default_db_path}")

engine = create_engine(DB_URL, connect_args={"check_same_thread": False} if "sqlite" in DB_URL else {})

from sqlalchemy import event
from sqlalchemy.engine import Engine

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if "sqlite" in DB_URL:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

LocalSession = sessionmaker(
    autoflush=False,
    bind=engine,
    expire_on_commit=False
)

def get_db():
    """
    Dependency cung cấp Session làm việc với CSDL cho mỗi API Request
    """
    db = LocalSession()
    try:
        yield db
    finally:
        db.close()


def seed_test_accounts():
    """
    Tạo 3 tài khoản test: admin, freelancer, business.
    Gọi sau khi tạo bảng: `from app.database import seed_test_accounts; seed_test_accounts()`
    """
    import uuid
    from datetime import datetime, timezone as dt_tz
    from app.models.users import User, UserStatus, UserRole
    from app.core.security import hash_password

    db = LocalSession()
    try:
        accounts = [
            {
                "email": "admin@demo.com",
                "password": "Admin@123",
                "role": UserRole.admin,
            },
            {
                "email": "freelancer@example.com",
                "password": "Freelancer@123",
                "role": UserRole.freelancer,
            },
            {
                "email": "business@example.com",
                "password": "Business@123",
                "role": UserRole.enterprise,
            },
        ]

        for acc in accounts:
            existing = db.query(User).filter(User.email == acc["email"]).first()
            if existing:
                print(f"[seed] Tài khoản {acc['email']} đã tồn tại, bỏ qua.")
                continue

            user = User(
                id=str(uuid.uuid4()),
                email=acc["email"],
                password_hash=hash_password(acc["password"]),
                status=UserStatus.active,
                email_verified_at=datetime.now(dt_tz.utc),
                role=acc["role"],
            )
            db.add(user)
            print(f"[seed] Đã tạo: {acc['email']} / {acc['password']} ({acc['role'].value})")

        db.commit()
        print("[seed] Hoàn tất seed tài khoản test.")
    except Exception as e:
        db.rollback()
        print(f"[seed] Lỗi: {e}")
        raise
    finally:
        db.close()