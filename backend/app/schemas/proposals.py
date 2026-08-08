from pydantic import BaseModel, model_validator
from typing import Optional, Any
from datetime import datetime
from enum import Enum


class ProposalStatusEnum(str, Enum):
    PENDING = 'PENDING'
    ACCEPTED = 'ACCEPTED'
    REJECTED = 'REJECTED'
    WITHDRAWN = 'WITHDRAWN'


class SkillRef(BaseModel):
    name: str

    class Config:
        from_attributes = True

class FreelancerRef(BaseModel):
    user_id: str
    display_name: str
    headline: Optional[str] = None
    hourly_rate: Optional[float] = None
    bio: Optional[str] = None
    experience_years: Optional[float] = None
    skills: Optional[list[SkillRef]] = []
    parsed_cv_json: Optional[dict] = None

    @model_validator(mode='before')
    @classmethod
    def extract_skills(cls, data: Any) -> Any:
        if hasattr(data, 'skills'):
            skills_list = []
            for fs in data.skills:
                if hasattr(fs, 'skill') and hasattr(fs.skill, 'name'):
                    skills_list.append({"name": fs.skill.name})
            # Vì data là đối tượng SQLAlchemy (hoặc dict), ta cần tạo 1 bản sao hoặc gán nếu là dict
            if isinstance(data, dict):
                data['skills'] = skills_list
            else:
                # Mẹo nhỏ: SQLAlchemy object không cho phép setattr dễ dàng, 
                # nên ta có thể trả về một dictionary từ object
                return {
                    "user_id": getattr(data, "user_id", None),
                    "display_name": getattr(data, "display_name", None),
                    "headline": getattr(data, "headline", None),
                    "hourly_rate": getattr(data, "hourly_rate", None),
                    "bio": getattr(data, "bio", None),
                    "experience_years": getattr(data, "experience_years", None),
                    "parsed_cv_json": getattr(data, "parsed_cv_json", None),
                    "skills": skills_list
                }
        return data

    class Config:
        from_attributes = True


class ProposalBase(BaseModel):
    cover_letter: str
    bid_amount: float
    estimated_duration: Optional[int] = None


class ProposalCreate(ProposalBase):
    pass


class ProposalDecision(BaseModel):
    decision: str  # 'accept' or 'reject'


class ProposalOut(BaseModel):
    id: str
    job_id: str
    freelancer_id: str
    cover_letter: str
    bid_amount: float
    estimated_duration: Optional[int]
    status: ProposalStatusEnum
    created_at: datetime
    freelancer: Optional[FreelancerRef] = None

    class Config:
        from_attributes = True


class ProposalListOut(BaseModel):
    id: str
    job_id: str
    freelancer_id: str
    bid_amount: float
    estimated_duration: Optional[int]
    status: ProposalStatusEnum
    created_at: datetime

    class Config:
        from_attributes = True

class MatchFactors(BaseModel):
    hard_skills: int
    experience: int
    domain_fit: int
    communication: int
    salary_fit: int

class ExplainMatchResponse(BaseModel):
    fit_score: int
    factors: MatchFactors
    pros: list[str]
    cons: list[str]
    interview_questions: list[str]
