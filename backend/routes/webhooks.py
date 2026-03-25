import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Response

from core.database import db
from core.dependencies import get_user_from_api_key
from core.exceptions import APIError, ErrorCodes
from models.webhooks import WebhookCreate, WebhookResponse, WebhookListResponse

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("", response_model=WebhookResponse, status_code=201)
async def create_webhook(data: WebhookCreate, user: dict = Depends(get_user_from_api_key)):
    """Create a new webhook subscription"""
    # Validate URL format
    if not data.url.startswith(("http://", "https://")):
        raise APIError(
            code=ErrorCodes.INVALID_URL,
            message="Webhook URL must start with http:// or https://",
            status_code=400,
            details={"field": "url", "value": data.url}
        )
    
    # Check for duplicate URL
    existing = await db.webhooks.find_one(
        {"user_id": user["id"], "url": data.url, "is_active": True}
    )
    if existing:
        raise APIError(
            code=ErrorCodes.DUPLICATE_WEBHOOK_URL,
            message="This webhook URL is already registered. Each URL can only be used once.",
            status_code=400,
            details={"url": data.url}
        )
    
    # Limit number of webhooks per user
    count = await db.webhooks.count_documents({"user_id": user["id"], "is_active": True})
    if count >= 10:
        raise APIError(
            code=ErrorCodes.WEBHOOK_LIMIT_REACHED,
            message="You have reached the maximum of 10 active webhooks. Delete an existing webhook to add a new one.",
            status_code=400,
            details={"current_count": count, "max_allowed": 10}
        )
    
    webhook_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Validate event types
    valid_events = ["outcome.created"]
    invalid_events = [e for e in data.events if e not in valid_events]
    if invalid_events:
        raise APIError(
            code=ErrorCodes.INVALID_ENUM_VALUE,
            message=f"Invalid event type(s): {', '.join(invalid_events)}. Supported events: {', '.join(valid_events)}",
            status_code=400,
            details={"invalid_events": invalid_events, "valid_events": valid_events}
        )
    
    webhook_doc = {
        "id": webhook_id,
        "user_id": user["id"],
        "url": data.url,
        "events": data.events,
        "description": data.description,
        "is_active": True,
        "created_at": now
    }
    
    await db.webhooks.insert_one(webhook_doc)
    
    return WebhookResponse(
        id=webhook_id,
        url=data.url,
        events=data.events,
        description=data.description,
        created_at=now,
        is_active=True
    )


@router.get("", response_model=WebhookListResponse)
async def list_webhooks(user: dict = Depends(get_user_from_api_key)):
    """List all webhooks for the authenticated user"""
    webhooks = await db.webhooks.find(
        {"user_id": user["id"], "is_active": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return WebhookListResponse(
        webhooks=[WebhookResponse(**w) for w in webhooks]
    )


@router.get("/{webhook_id}", response_model=WebhookResponse)
async def get_webhook(webhook_id: str, user: dict = Depends(get_user_from_api_key)):
    """Get a specific webhook"""
    webhook = await db.webhooks.find_one(
        {"id": webhook_id, "user_id": user["id"], "is_active": True},
        {"_id": 0}
    )
    if not webhook:
        raise APIError(
            code=ErrorCodes.WEBHOOK_NOT_FOUND,
            message="Webhook not found or has been deleted.",
            status_code=404,
            details={"webhook_id": webhook_id}
        )
    
    return WebhookResponse(**webhook)


@router.delete("/{webhook_id}", status_code=204)
async def delete_webhook(webhook_id: str, user: dict = Depends(get_user_from_api_key)):
    """Delete (deactivate) a webhook"""
    webhook = await db.webhooks.find_one(
        {"id": webhook_id, "user_id": user["id"]}
    )
    if not webhook:
        raise APIError(
            code=ErrorCodes.WEBHOOK_NOT_FOUND,
            message="Webhook not found.",
            status_code=404,
            details={"webhook_id": webhook_id}
        )
    
    await db.webhooks.update_one(
        {"id": webhook_id},
        {"$set": {"is_active": False, "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return Response(status_code=204)
