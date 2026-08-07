from pydantic import BaseModel, EmailStr
from typing import Optional


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class RefreshIn(BaseModel):
    refresh_token: str


class ChangePasswordIn(BaseModel):
    old_password: str
    new_password: str


class ResetPasswordRequestIn(BaseModel):
    email: EmailStr


class ResetPasswordConfirmIn(BaseModel):
    token: str
    new_password: str


class EmailVerificationRequestIn(BaseModel):
    email: EmailStr


class EmailVerificationConfirmIn(BaseModel):
    token: str


class TokenOut(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str
