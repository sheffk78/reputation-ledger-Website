import uuid
import httpx
import logging
from datetime import datetime, timezone

from core.database import db

logger = logging.getLogger(__name__)


async def trigger_webhooks(user_id: str, event_type: str, payload: dict):
    """Trigger all active webhooks for a user for a specific event"""
    webhooks = await db.webhooks.find(
        {"user_id": user_id, "is_active": True},
        {"_id": 0}
    ).to_list(100)
    
    for webhook in webhooks:
        if event_type in webhook.get("events", []):
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    webhook_payload = {
                        "event": event_type,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "data": payload
                    }
                    response = await client.post(
                        webhook["url"],
                        json=webhook_payload,
                        headers={"Content-Type": "application/json", "X-RepLedger-Event": event_type}
                    )
                    
                    # Log webhook delivery
                    await db.webhook_logs.insert_one({
                        "id": str(uuid.uuid4()),
                        "webhook_id": webhook["id"],
                        "user_id": user_id,
                        "event": event_type,
                        "url": webhook["url"],
                        "status_code": response.status_code,
                        "success": 200 <= response.status_code < 300,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    })
                    logger.info(f"Webhook delivered to {webhook['url']} with status {response.status_code}")
            except Exception as e:
                # Log failed delivery
                await db.webhook_logs.insert_one({
                    "id": str(uuid.uuid4()),
                    "webhook_id": webhook["id"],
                    "user_id": user_id,
                    "event": event_type,
                    "url": webhook["url"],
                    "status_code": None,
                    "success": False,
                    "error": str(e),
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                logger.error(f"Failed to deliver webhook to {webhook['url']}: {e}")
