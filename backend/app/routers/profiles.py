from fastapi import APIRouter, Depends, Request, status, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.profiles import FreelancerProfileOut, FreelancerProfileUpdate, SkillUpdateIn, PortfolioItemIn, OrganizationProfileOut, OrganizationProfileUpdate
from app.schemas.default import BaseResponse
from app.core.dependencies import get_current_user
from app.models.users import User
from app.models.freelancers import FrelancerProfile
from app.models.skills import Skill
from app.models.freelancer_skills import FreelancerSkill
from app.models.portfolio_items import PortfolioItem
from app.models.organizations import Organization
import os
from uuid import uuid4

router = APIRouter()

STORAGE_DIR = os.path.join(os.path.dirname(
    os.path.dirname(os.path.dirname(__file__))), 'uploads')
os.makedirs(STORAGE_DIR, exist_ok=True)


@router.get('/freelancer/profile')
def get_freelancer_profile(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(FrelancerProfile).filter(
        FrelancerProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail='Không tìm thấy profile freelancer')
    data = {
        'display_name': profile.display_name,
        'headline': profile.headline,
        'bio': profile.bio,
        'experience_years': float(profile.experience_years) if profile.experience_years is not None else None,
        'hourly_rate': float(profile.hourly_rate) if profile.hourly_rate is not None else None,
        'currency': profile.currency,
        'availability_status': profile.availability_status,
        'profile_completion': profile.profile_completion
    }
    return BaseResponse.create(status_code=status.HTTP_200_OK, message='Lấy profile freelancer thành công', data=data, error=None, timestamp=None, path=request.url.path)


@router.patch('/freelancer/profile')
def update_freelancer_profile(request: Request, payload: FreelancerProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(FrelancerProfile).filter(
        FrelancerProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail='Không tìm thấy profile freelancer')
    if payload.display_name is not None:
        profile.display_name = payload.display_name
    if payload.headline is not None:
        profile.headline = payload.headline
    if payload.bio is not None:
        profile.bio = payload.bio
    if payload.experience_years is not None:
        profile.experience_years = payload.experience_years
    if payload.hourly_rate is not None:
        profile.hourly_rate = payload.hourly_rate
    if payload.availability_status is not None:
        profile.availability_status = payload.availability_status
    db.add(profile)
    db.commit()
    return BaseResponse.create(status_code=status.HTTP_200_OK, message='Cập nhật profile freelancer thành công', data=None, error=None, timestamp=None, path=request.url.path)


@router.put('/freelancer/skills')
def update_freelancer_skills(request: Request, payload: SkillUpdateIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(FrelancerProfile).filter(
        FrelancerProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail='Không tìm thấy profile freelancer')
    db.query(FreelancerSkill).filter(
        FreelancerSkill.freelancer_profile_id == profile.user_id).delete()
    for skill_name in payload.skills:
        skill = db.query(Skill).filter(Skill.name == skill_name).first()
        if not skill:
            skill = Skill(name=skill_name)
            db.add(skill)
            db.commit()
        link = FreelancerSkill(
            freelancer_profile_id=profile.user_id, skill_id=skill.id)
        db.add(link)
    db.commit()
    return BaseResponse.create(status_code=status.HTTP_200_OK, message='Cập nhật kỹ năng thành công', data=None, error=None, timestamp=None, path=request.url.path)


@router.post('/freelancer/portfolio')
def add_portfolio_item(request: Request, payload: PortfolioItemIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(FrelancerProfile).filter(
        FrelancerProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail='Không tìm thấy profile freelancer')
    item = PortfolioItem(
        freelancer_profile_id=profile.user_id,
        title=payload.title,
        description=payload.description,
        url=str(payload.url) if payload.url else None
    )
    db.add(item)
    db.commit()
    return BaseResponse.create(status_code=status.HTTP_201_CREATED, message='Thêm portfolio thành công', data={'portfolio_id': item.id}, error=None, timestamp=None, path=request.url.path)


@router.post('/users/avatar')
def upload_avatar(request: Request, file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    filename = f"avatar_{current_user.id}_{uuid4().hex}_{file.filename}"
    filepath = os.path.join(STORAGE_DIR, filename)
    with open(filepath, 'wb') as f:
        f.write(file.file.read())
    current_user.avatar_path = filepath
    db.add(current_user)
    db.commit()
    return BaseResponse.create(status_code=status.HTTP_200_OK, message='Upload avatar thành công', data={'path': filepath}, error=None, timestamp=None, path=request.url.path)


@router.post('/organization/logo')
def upload_organization_logo(request: Request, file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    organization = db.query(Organization).filter(
        Organization.owner_user_id == current_user.id).first()
    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail='Không tìm thấy tổ chức của người dùng')
    filename = f"logo_{organization.id}_{uuid4().hex}_{file.filename}"
    filepath = os.path.join(STORAGE_DIR, filename)
    with open(filepath, 'wb') as f:
        f.write(file.file.read())
    organization.logo_path = filepath
    db.add(organization)
    db.commit()
    return BaseResponse.create(status_code=status.HTTP_200_OK, message='Upload logo công ty thành công', data={'path': filepath}, error=None, timestamp=None, path=request.url.path)


@router.get('/organization/profile')
def get_organization_profile(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    organization = db.query(Organization).filter(
        Organization.owner_user_id == current_user.id).first()
    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail='Không tìm thấy tổ chức')
    data = {
        'name': organization.name,
        'industry': None,
        'description': organization.description,
        'website': organization.website,
        'tax_code': organization.tax_code,
        'verification_status': organization.verification_status.value
    }
    return BaseResponse.create(status_code=status.HTTP_200_OK, message='Lấy profile tổ chức thành công', data=data, error=None, timestamp=None, path=request.url.path)


@router.patch('/organization/profile')
def update_organization_profile(request: Request, payload: OrganizationProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    organization = db.query(Organization).filter(
        Organization.owner_user_id == current_user.id).first()
    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail='Không tìm thấy tổ chức')
    if payload.name is not None:
        organization.name = payload.name
    if payload.description is not None:
        organization.description = payload.description
    if payload.industry is not None:
        organization.industry = payload.industry
    if payload.website is not None:
        organization.website = payload.website
    db.add(organization)
    db.commit()
    return BaseResponse.create(status_code=status.HTTP_200_OK, message='Cập nhật profile tổ chức thành công', data=None, error=None, timestamp=None, path=request.url.path)
