from pydantic import BaseModel,Field,EmailStr

class FreelancerInfoIn(BaseModel):
    display_name: str
    email: EmailStr
    password: str
    timezone: str = "UTC"