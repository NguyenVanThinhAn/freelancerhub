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
from app.models.cv_documents import CVDocument
from app.models.cv_results import CVParseResult, CVExtractedField, FieldEvidenceLevelEnum
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
    if payload.headline is not None:
        profile.headline = payload.headline
    if payload.bio is not None:
        profile.bio = payload.bio
    if payload.hourly_rate is not None:
        profile.hourly_rate = payload.hourly_rate
    if payload.availability_status is not None:
        profile.availability_status = payload.availability_status
    db.add(profile)
    db.commit()
    return BaseResponse.create(status_code=status.HTTP_200_OK, message='Cập nhật profile freelancer thành công', data=None, error=None, timestamp=None, path=request.url.path)


@router.get('/freelancer/cv-import')
def get_cv_import_data(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Lấy dữ liệu trích xuất từ CV đã upload gần nhất của freelancer để prefill vào Profile.
    Trả về: full_name (từ personalInfo.fullName), skills (gom từ skills + tools), 
            education_summary, projects_summary, latest CV status.
    """
    # Lấy CV document gần nhất có parse result
    doc = db.query(CVDocument).filter(
        CVDocument.freelancer_id == current_user.id
    ).order_by(CVDocument.created_at.desc()).first()

    if not doc:
        return BaseResponse.create(
            status_code=status.HTTP_200_OK,
            message='Chưa có CV nào được upload',
            data={'has_cv': False},
            error=None,
            path=request.url.path
        )

    parse_result = db.query(CVParseResult).filter(
        CVParseResult.cv_document_id == doc.id).first()

    extracted = {}
    if parse_result:
        fields = db.query(CVExtractedField).filter(
            CVExtractedField.cv_parse_result_id == parse_result.id
        ).all()
        for f in fields:
            extracted[f.field_path] = f.value_json

    # Gom skills từ skills.technicalSkills + skills.analyticsSkills + skills.languages + tools
    skills_set: list[str] = []
    seen: set[str] = set()

    def add_skill(name: str):
        n = (name or "").strip()
        if not n:
            return
        if n.lower() not in seen:
            seen.add(n.lower())
            skills_set.append(n)

    skills_obj = extracted.get('skills') or {}
    if isinstance(skills_obj, dict):
        for key in ('technicalSkills', 'analyticsSkills', 'languages', 'softSkills'):
            items = skills_obj.get(key) or []
            if isinstance(items, list):
                for s in items:
                    add_skill(str(s))
    elif isinstance(skills_obj, list):
        for s in skills_obj:
            add_skill(str(s))

    tools = extracted.get('tools') or []
    if isinstance(tools, list):
        for t in tools:
            add_skill(str(t))

    # full_name
    personal = extracted.get('personalInfo') or {}
    if not isinstance(personal, dict):
        personal = {}
    full_name = personal.get('fullName')

    # Experience: lấy 1 entry mới nhất làm headline suggestion
    work_exp = extracted.get('workExperience') or []
    headline_hint = None
    if isinstance(work_exp, list) and work_exp:
        latest = work_exp[0]
        if isinstance(latest, dict):
            title = latest.get('title') or ''
            company = latest.get('company') or ''
            if title or company:
                headline_hint = f"{title}{f' tại {company}' if company else ''}".strip()

    # Education summary
    education = extracted.get('education') or []
    education_summary = []
    if isinstance(education, list):
        for e in education[:2]:
            if isinstance(e, dict):
                education_summary.append({
                    'degree': e.get('degree'),
                    'institution': e.get('institution'),
                    'duration': e.get('duration'),
                })

    # Projects summary
    projects = extracted.get('projects') or []
    projects_summary = []
    if isinstance(projects, list):
        for p in projects[:5]:
            if isinstance(p, dict):
                projects_summary.append({
                    'title': p.get('title'),
                    'type': p.get('type'),
                })

    data = {
        'has_cv': True,
        'cv_document_id': doc.id,
        'cv_status': doc.status.value,
        'overall_confidence': parse_result.overall_confidence if parse_result else None,
        'completeness_percent': parse_result.completeness_percent if parse_result else None,
        'full_name': full_name,
        'headline_hint': headline_hint,
        'skills': skills_set,
        'education_summary': education_summary,
        'projects_summary': projects_summary,
    }

    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Lấy dữ liệu CV để import thành công',
        data=data,
        error=None,
        path=request.url.path
    )


@router.put('/freelancer/skills')
def update_freelancer_skills(request: Request, payload: SkillUpdateIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(FrelancerProfile).filter(
        FrelancerProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail='Không tìm thấy profile freelancer')
    db.query(FreelancerSkill).filter(
        FreelancerSkill.freelancer_profile_id == current_user.id).delete()
    for skill_name in payload.skills:
        skill = db.query(Skill).filter(Skill.name == skill_name).first()
        if not skill:
            skill = Skill(name=skill_name)
            db.add(skill)
            db.commit()
        link = FreelancerSkill(
            freelancer_profile_id=current_user.id, skill_id=skill.id)
        db.add(link)
    db.commit()
    return BaseResponse.create(status_code=status.HTTP_200_OK, message='Cập nhật kỹ năng thành công', data=None, error=None, timestamp=None, path=request.url.path)


@router.get('/freelancer/skills')
def get_freelancer_skills(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(FrelancerProfile).filter(
        FrelancerProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail='Không tìm thấy profile freelancer')
    links = db.query(FreelancerSkill).filter(
        FreelancerSkill.freelancer_profile_id == current_user.id).all()
    skills = []
    for link in links:
        skill = db.query(Skill).filter(Skill.id == link.skill_id).first()
        if skill:
            skills.append({'id': skill.id, 'name': skill.name})
    return BaseResponse.create(status_code=status.HTTP_200_OK, message='Lấy kỹ năng thành công', data=skills, error=None, timestamp=None, path=request.url.path)


@router.get('/freelancer/portfolio')
def list_portfolio_items(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(FrelancerProfile).filter(
        FrelancerProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail='Không tìm thấy profile freelancer')
    items = db.query(PortfolioItem).filter(
        PortfolioItem.freelancer_profile_id == current_user.id).order_by(PortfolioItem.id.desc()).all()
    data = [
        {
            'id': item.id,
            'title': item.title,
            'description': item.description,
            'url': item.url,
            'image_path': item.image_path,
        }
        for item in items
    ]
    return BaseResponse.create(status_code=status.HTTP_200_OK, message='Lấy portfolio thành công', data=data, error=None, timestamp=None, path=request.url.path)


@router.post('/freelancer/portfolio')
def add_portfolio_item(request: Request, payload: PortfolioItemIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(FrelancerProfile).filter(
        FrelancerProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail='Không tìm thấy profile freelancer')
    item = PortfolioItem(
        freelancer_profile_id=current_user.id,
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
        'industry': organization.industry,
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
