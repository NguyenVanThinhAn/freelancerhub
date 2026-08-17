from pydantic import BaseModel, EmailStr
from typing import Optional

class BusinessRegisterIn(BaseModel):
    # Tên công ty / doanh nghiệp
    company_name: str
    
    # Email đại diện doanh nghiệp (dùng để đăng nhập)
    email: EmailStr
    
    # Mật khẩu đăng nhập
    password: str
    
    # Mã số thuế (Không bắt buộc khi vừa đăng ký)
    tax_code: Optional[str] = None
    
    # Website công ty (Không bắt buộc)
    website: Optional[str] = None
    
    # Mô tả ngắn về doanh nghiệp (Không bắt buộc)
    description: Optional[str] = None
    
    # Múi giờ hệ thống (Mặc định: Asia/Ho_Chi_Minh)
    timezone: str = "Asia/Ho_Chi_Minh"
