"""
Settings Routes

Handles user settings like notification preferences.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional

from core.database import db
from core.dependencies import get_current_user


router = APIRouter(prefix="/settings", tags=["settings"])


class NotificationPreferences(BaseModel):
    """User notification preferences"""
    email_outcome_notifications: bool = True
    email_flag_notifications: bool = True
    email_weekly_summary: bool = False


class NotificationPreferencesResponse(BaseModel):
    """Response for notification preferences"""
    preferences: NotificationPreferences
    message: Optional[str] = None


@router.get("/notifications", response_model=NotificationPreferencesResponse)
async def get_notification_preferences(user: dict = Depends(get_current_user)):
    """Get user's notification preferences"""
    # Get existing preferences or return defaults
    prefs = await db.user_preferences.find_one(
        {"user_id": user["id"]},
        {"_id": 0}
    )
    
    if prefs and "notifications" in prefs:
        return NotificationPreferencesResponse(
            preferences=NotificationPreferences(**prefs["notifications"])
        )
    
    # Return defaults
    return NotificationPreferencesResponse(
        preferences=NotificationPreferences()
    )


@router.put("/notifications", response_model=NotificationPreferencesResponse)
async def update_notification_preferences(
    preferences: NotificationPreferences,
    user: dict = Depends(get_current_user)
):
    """Update user's notification preferences"""
    await db.user_preferences.update_one(
        {"user_id": user["id"]},
        {
            "$set": {
                "user_id": user["id"],
                "notifications": preferences.model_dump()
            }
        },
        upsert=True
    )
    
    return NotificationPreferencesResponse(
        preferences=preferences,
        message="Preferences updated successfully"
    )
