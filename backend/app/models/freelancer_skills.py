from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class FreelancerSkill(Base):
    __tablename__ = 'freelancer_skills'

    freelancer_profile_id = Column(String(36), ForeignKey(
        'freelancer_profiles.user_id', ondelete='CASCADE'), primary_key=True)
    skill_id = Column(String(36), ForeignKey(
        'skills.id', ondelete='CASCADE'), primary_key=True)

    profile = relationship('FrelancerProfile', back_populates='skills')
    skill = relationship('Skill', back_populates='freelancer_links')
