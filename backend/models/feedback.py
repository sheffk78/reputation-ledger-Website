"""Feedback and Client Events Models"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime


class FeedbackCreate(BaseModel):
    """Request to submit feedback"""
    message: str = Field(..., min_length=1, max_length=5000)
    email: Optional[str] = None


class FeedbackResponse(BaseModel):
    """Single feedback entry"""
    id: str
    user_id: Optional[str] = None
    user_email: str
    email_override: Optional[str] = None
    message: str
    created_at: str


class FeedbackListResponse(BaseModel):
    """Paginated feedback list"""
    feedback: List[FeedbackResponse]
    page: int
    limit: int
    total: int


class ClientEventCreate(BaseModel):
    """Request to log a client event"""
    event_name: str = Field(..., min_length=1, max_length=100)
    context: Optional[Dict[str, Any]] = None


class ClientEventResponse(BaseModel):
    """Single client event"""
    id: str
    user_id: Optional[str] = None
    event_name: str
    context: Optional[Dict[str, Any]] = None
    created_at: str


class FeatureRequestCreate(BaseModel):
    """Request to submit a feature request"""
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=2000)
    email: Optional[EmailStr] = None


class FeatureRequestResponse(BaseModel):
    """Single feature request entry"""
    id: str
    title: str
    description: str
    email: Optional[str] = None
    created_at: str
