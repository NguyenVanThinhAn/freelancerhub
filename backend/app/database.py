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