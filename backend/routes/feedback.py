"""Feedback and Client Events Routes"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from typing import Optional

from core.database import db
from core.dependencies import get_current_user
from models.feedback import (
    FeedbackCreate, 
    FeedbackResponse,
    ClientEventCreate,
    ClientEventResponse,
    FeatureRequestCreate,
    FeatureRequestResponse
)

router = APIRouter(tags=["feedback"])


@router.post("/feedback", response_model=FeedbackResponse, status_code=201)
async def submit_feedback(
    data: FeedbackCreate,
    user: dict = Depends(get_current_user)
):
    """Submit user feedback"""
    feedback_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    feedback_doc = {
        "id": feedback_id,
        "user_id": user["id"],
        "user_email": user["email"],
        "email_override": data.email if data.email and data.email != user["email"] else None,
        "message": data.message,
        "created_at": now
    }
    
    await db.feedback.insert_one(feedback_doc)
    
    return FeedbackResponse(
        id=feedback_id,
        user_id=user["id"],
        user_email=user["email"],
        email_override=feedback_doc["email_override"],
        message=data.message,
        created_at=now
    )


@router.post("/client-events", response_model=ClientEventResponse, status_code=201)
async def log_client_event(
    data: ClientEventCreate,
    user: Optional[dict] = Depends(get_current_user)
):
    """Log a client-side event for analytics"""
    event_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    event_doc = {
        "id": event_id,
        "user_id": user["id"] if user else None,
        "event_name": data.event_name,
        "context": data.context or {},
        "created_at": now
    }
    
    await db.client_events.insert_one(event_doc)
    
    return ClientEventResponse(
        id=event_id,
        user_id=user["id"] if user else None,
        event_name=data.event_name,
        context=data.context,
        created_at=now
    )



@router.post("/feature-requests", response_model=FeatureRequestResponse, status_code=201)
async def submit_feature_request(data: FeatureRequestCreate):
    """Submit a feature request (public, no auth required)"""
    request_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "id": request_id,
        "title": data.title,
        "description": data.description,
        "email": data.email,
        "created_at": now
    }
    
    await db.feature_requests.insert_one(doc)
    
    return FeatureRequestResponse(
        id=request_id,
        title=data.title,
        description=data.description,
        email=data.email,
        created_at=now
    )
