from pydantic import BaseModel,Field,EmailStr

class UserInfoIn(BaseModel):
    email: EmailStr
    password: str
    timezone: str = "Asia/Ho_Chi_Minh"