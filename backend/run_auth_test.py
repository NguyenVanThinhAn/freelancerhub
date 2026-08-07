from app.database import Base, engine, LocalSession
from app.core.security import hash_password
from app.models.users import User
from fastapi.testclient import TestClient
from main import app
import os
import sys
from pathlib import Path

# Use SQLite test DB for running local test script
os.environ['DB_URL'] = 'sqlite:///./test.db'

# Ensure backend package is importable
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))


# Remove existing test DB to avoid schema default incompatibilities
try:
    TEST_DB_PATH = Path(HERE) / 'test.db'
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()
        print('Removed existing test.db')
except Exception:
    pass

# Create tables
Base.metadata.create_all(bind=engine)

# Create test user if not exists
db = LocalSession()
try:
    user = db.query(User).filter(User.email == 'testuser@example.com').first()
    if not user:
        user = User(email='testuser@example.com',
                    password_hash=hash_password('Secret123!'), status='active')
        db.add(user)
        db.commit()
        print('created', user.id)
    else:
        print('exists', user.id)
finally:
    db.close()

# Run FastAPI TestClient to call login

client = TestClient(app)
resp = client.post('/api/v1/auth/login',
                   json={'email': 'testuser@example.com', 'password': 'Secret123!'})
print('status', resp.status_code)
print(resp.json())
