from sqlalchemy import Column, String, Text, DateTime
from datetime import datetime, timezone
import uuid
from app.database import Base

class Category(Base):
    __tablename__ = 'categories'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
