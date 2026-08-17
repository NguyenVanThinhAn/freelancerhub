"""Seed Categories & Skills. Idempotent — chạy lại không tạo trùng.

Run:
  venv/Scripts/python.exe seed_categories.py
"""
import sys

sys.path.append('.')

from app.database import get_db
from app.models.categories import Category
from app.models.skills import Skill


CATEGORIES = [
    {"name": "IT - Phần mềm", "description": "Phát triển phần mềm, lập trình web, mobile, backend, AI/ML."},
    {"name": "Thiết kế đồ hoạ", "description": "UI/UX, branding, thiết kế in ấn, motion graphics."},
    {"name": "Marketing", "description": "Digital marketing, SEO, content, social media, quảng cáo."},
    {"name": "Dịch thuật", "description": "Dịch thuật đa ngôn ngữ, phiên dịch, localization."},
    {"name": "Kế toán - Tài chính", "description": "Kế toán, kiểm toán, tư vấn tài chính, thuế."},
    {"name": "Pháp lý", "description": "Tư vấn pháp luật, hợp đồng, sở hữu trí tuệ."},
]


SKILLS = [
    "Python", "JavaScript", "TypeScript", "React", "Node.js", "Vue.js",
    "Angular", "Java", "Spring Boot", "C#", ".NET", "PHP", "Laravel",
    "Go", "Rust", "Swift", "Kotlin", "Flutter", "React Native",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Docker", "Kubernetes",
    "AWS", "GCP", "Azure", "CI", "CD",
    "Figma", "Adobe XD", "Photoshop", "Illustrator", "UI/UX",
    "SEO", "Content Marketing", "Google Ads", "Facebook Ads", "TikTok Ads",
    "Tiếng Anh", "Tiếng Nhật", "Tiếng Hàn", "Tiếng Trung", "Tiếng Pháp",
    "Power BI", "Excel", "SQL", "Tableau",
    "Agile", "Scrum", "Jira", "Confluence", "Notion",
    "Git", "GitHub", "GitLab", "Linux", "Bash",
]


def main() -> None:
    db = next(get_db())
    try:
        for c in CATEGORIES:
            if not db.query(Category).filter(Category.name == c["name"]).first():
                db.add(Category(**c))
                print(f"[ADD] category: {c['name']}")
            else:
                print(f"[SKIP] category: {c['name']}")

        for s in SKILLS:
            if not db.query(Skill).filter(Skill.name == s).first():
                db.add(Skill(name=s, description=f"{s} Skill"))
                print(f"[ADD] skill: {s}")
            else:
                print(f"[SKIP] skill: {s}")

        db.commit()
        print("Done seeding categories & skills.")
    except Exception as exc:
        db.rollback()
        print(f"Seed failed: {exc!r}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()