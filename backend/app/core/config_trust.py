"""
Cấu hình Trust Passport — Badge display names (i18n-ready).
Theo MASTER-DOC Phần M.5: Badge names phải rõ ràng, có thể explain được.
Dời từ `app/routers/admin_cv.py` để reuse được ở nhiều nơi và hỗ trợ i18n.
"""
from typing import Dict

# Ánh xạ field_path -> Tên Huy hiệu hiển thị (tiếng Việt)
# Thêm ngôn ngữ khác bằng cách thêm key: `BADGE_NAMES["en"]["personalInfo.email"]`
BADGE_NAMES: Dict[str, Dict[str, str]] = {
    "vi": {
        "personalInfo.fullName": "Họ và tên đã xác thực",
        "personalInfo.phone": "Số điện thoại đã xác thực",
        "personalInfo.email": "Email đã xác thực",
        "personalInfo.address": "Địa chỉ đã xác thực",
        "education": "Bằng cấp & Học vấn đã đối soát",
        "workExperience": "Kinh nghiệm làm việc đã đối soát",
        "skills": "Kỹ năng chuyên môn đã kiểm chứng",
        "tools": "Công cụ & Phần mềm đã kiểm chứng",
        "projects": "Dự án thực tế đã kiểm chứng",
        "licensesCertificationsAwards": "Chứng chỉ & Giải thưởng đã kiểm chứng",
    },
    "en": {
        "personalInfo.fullName": "Verified Full Name",
        "personalInfo.phone": "Verified Phone Number",
        "personalInfo.email": "Verified Email",
        "personalInfo.address": "Verified Address",
        "education": "Verified Education & Degrees",
        "workExperience": "Verified Work Experience",
        "skills": "Verified Professional Skills",
        "tools": "Verified Tools & Software",
        "projects": "Verified Real Projects",
        "licensesCertificationsAwards": "Verified Certifications & Awards",
    },
}

DEFAULT_LOCALE = "vi"


def get_badge_name(field_path: str, locale: str = DEFAULT_LOCALE) -> str:
    """
    Lấy tên badge theo field_path và locale.
    Trả về fallback an toàn nếu không tìm thấy.
    """
    lang = locale if locale in BADGE_NAMES else DEFAULT_LOCALE
    names = BADGE_NAMES.get(lang, BADGE_NAMES[DEFAULT_LOCALE])
    return names.get(field_path, f"Đã xác thực {field_path}")
