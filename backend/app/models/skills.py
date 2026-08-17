from sqlalchemy import Column, String
from sqlalchemy.orm import relationship
import enum
import uuid
from app.database import Base


class Skill(Base):
    __tablename__ = 'skills'

    id = Column(String(36), primary_key=True,
                default=lambda: str(uuid.uuid4()))
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)

    # Quan hệ tới bảng trung gian FreelancerSkill
    freelancer_links = relationship(
        'FreelancerSkill', back_populates='skill', cascade='all, delete-orphan')
