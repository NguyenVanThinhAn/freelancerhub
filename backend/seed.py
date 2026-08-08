import sys
import os
sys.path.append('/Users/admin/Downloads/freelancerhub/backend')
from app.database import get_db
from app.models.categories import Category
from app.models.skills import Skill

db = next(get_db())

categories = ["IT - Phần mềm", "Thiết kế đồ hoạ", "Marketing", "Dịch thuật"]
skills = ["Python", "React", "NodeJS", "UI/UX", "Figma", "SEO", "Tiếng Anh"]

print("Seeding Categories...")
for c in categories:
    if not db.query(Category).filter(Category.name == c).first():
        db.add(Category(name=c, description=f"{c} Category"))

print("Seeding Skills...")
for s in skills:
    if not db.query(Skill).filter(Skill.name == s).first():
        db.add(Skill(name=s, description=f"{s} Skill"))

db.commit()
print("Done seeding.")
