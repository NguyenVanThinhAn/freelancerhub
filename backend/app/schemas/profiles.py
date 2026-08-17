from pydantic import BaseModel, EmailStr, HttpUrl
from typing import Optional, List


class FreelancerProfileOut(BaseModel):
    display_name: str
    headline: Optional[str] = None
    bio: Optional[str] = None
    experience_years: Optional[float] = None
    hourly_rate: Optional[float] = None
    currency: Optional[str] = None
    availability_status: Optional[str] = None
    profile_completion: Optional[int] = None


class FreelancerProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    headline: Optional[str] = None
    bio: Optional[str] = None
    experience_years: Optional[float] = None
    hourly_rate: Optional[float] = None
    availability_status: Optional[str] = None


class SkillUpdateIn(BaseModel):
    skills: List[str]


class PortfolioItemIn(BaseModel):
    title: str
    description: Optional[str] = None
    url: Optional[HttpUrl] = None


class OrganizationProfileOut(BaseModel):
    name: str
    industry: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    tax_code: Optional[str] = None
    verification_status: Optional[str] = None


class OrganizationProfileUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
