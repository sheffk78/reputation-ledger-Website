from pydantic import BaseModel, Field, EmailStr
from typing import Optional


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    created_at: str
    is_admin: bool = False
    organization_id: Optional[str] = None  # Cross-tool: org_XXXX format
    plan: Optional[str] = "free"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ApiKeyResponse(BaseModel):
    api_key: str
    created_at: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=6)


class OrgLinkRequest(BaseModel):
    """Request to link user/agents to an organization"""
    link_token: str = Field(..., min_length=4)


class OrgLinkResponse(BaseModel):
    """Response after successful org linking"""
    linked: bool
    organization_id: str
    agents_updated: int
