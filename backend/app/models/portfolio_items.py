from sqlalchemy import Column, String, Text, ForeignKey
from sqlalchemy.orm import relationship
import uuid
from app.database import Base


class PortfolioItem(Base):
    __tablename__ = 'portfolio_items'

    id = Column(String(36), primary_key=True,
                default=lambda: str(uuid.uuid4()))
    freelancer_profile_id = Column(String(36), ForeignKey(
        'freelancer_profiles.user_id', ondelete='CASCADE'), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    url = Column(String(255), nullable=True)
    image_path = Column(String(255), nullable=True)

    profile = relationship(
        'FrelancerProfile', back_populates='portfolio_items')
