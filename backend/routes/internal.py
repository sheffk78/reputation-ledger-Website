"""
Internal Events API for cross-tool event ingestion.

This module handles incoming events from AAV, Safe-Spend, and other
AgenticTrust tools. Events are authenticated via HMAC-SHA256 signatures.
"""
import os
import json
import uuid
import hmac
import hashlib
import secrets
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from pydantic import BaseModel

from core.database import db
from services.webhook_service import trigger_webhooks
from services.email_service import send_outcome_notification_email

router = APIRouter(prefix="/internal", tags=["internal"])

# Environment variables
INTERNAL_WEBHOOK_SECRET = os.environ.get("INTERNAL_WEBHOOK_SECRET", "")
INTERNAL_SUBSCRIBERS = os.environ.get("INTERNAL_SUBSCRIBERS", "").split(",")
INTERNAL_SUBSCRIBERS = [s.strip() for s in INTERNAL_SUBSCRIBERS if s.strip()]


class InternalEvent(BaseModel):
    """Internal cross-tool event structure"""
    id: Optional[str] = None
    source: str  # aav, safe_spend, arl
    source_version: Optional[str] = "1.0.0"
    event_type: str
    org_id: Optional[str] = None
    uaid: str  # Universal Agent ID (agt_...)
    timestamp: Optional[str] = None
    data: Dict[str, Any] = {}


class InternalEventResponse(BaseModel):
    received: bool
    event_id: Optional[str] = None
    outcome_id: Optional[str] = None


def verify_hmac_signature(body: bytes, signature: str) -> bool:
    """Verify HMAC-SHA256 signature for internal events."""
    if not INTERNAL_WEBHOOK_SECRET:
        # If no secret configured, reject all requests
        return False
    
    if not signature:
        return False
    
    expected = hmac.new(
        INTERNAL_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    
    # Use compare_digest to prevent timing attacks
    return hmac.compare_digest(f"sha256={expected}", signature) or hmac.compare_digest(expected, signature)


async def auto_log_outcome(
    uaid: str,
    result: str,
    task_type: str,
    source: str,
    source_event_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Optional[str]:
    """
    Auto-log an outcome from a cross-tool event.
    Returns the outcome_id if created, None if agent not found.
    """
    # Verify agent exists
    agent = await db.agents.find_one({"agent_id": uaid}, {"_id": 0})
    if not agent:
        # Agent not registered in ARL — skip silently
        return None
    
    outcome_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    outcome_doc = {
        "id": outcome_id,
        "agent_id": uaid,
        "result": result,
        "task_type": task_type,
        "submitter_type": "operator",  # Cross-tool events are operator-submitted
        "source": source,
        "source_event_id": source_event_id,
        "metadata": metadata or {},
        "created_at": now
    }
    
    await db.outcomes.insert_one(outcome_doc)
    
    # Get user for webhook/email delivery
    user = await db.users.find_one({"id": agent["user_id"]}, {"_id": 0})
    if user:
        # Trigger existing webhook delivery
        await trigger_webhooks(
            user["id"],
            "outcome.created",
            {
                "outcome_id": outcome_id,
                "agent_id": uaid,
                "agent_name": agent["name"],
                "result": result,
                "task_type": task_type,
                "submitter_type": "operator",
                "source": source,
                "created_at": now
            }
        )
        
        # Calculate new score for email notification
        from services.score_service import calculate_score_and_tier
        outcomes = await db.outcomes.find(
            {"agent_id": uaid},
            {"_id": 0}
        ).to_list(10000)
        new_score, new_tier, _, _ = calculate_score_and_tier(outcomes)
        
        # Send outcome notification email if user has notifications enabled
        if user.get("email_notifications", True):
            await send_outcome_notification_email(
                user["email"],
                agent["name"],
                uaid,
                result,
                task_type,
                new_score,
                new_tier
            )
    
    return outcome_id


async def emit_cross_tool_event(
    event_type: str,
    uaid: str,
    org_id: Optional[str],
    data: Dict[str, Any]
):
    """
    Emit an event to the internal event bus.
    Delivers to all registered internal subscribers.
    """
    import httpx
    
    event = {
        "id": f"evt_at_{secrets.token_hex(6)}",
        "source": "arl",
        "source_version": "1.0.0",
        "event_type": event_type,
        "org_id": org_id,
        "uaid": uaid,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": data
    }
    
    # Deliver to registered internal subscribers
    for subscriber_url in INTERNAL_SUBSCRIBERS:
        if not subscriber_url:
            continue
        try:
            body = json.dumps(event).encode()
            signature = hmac.new(
                INTERNAL_WEBHOOK_SECRET.encode(),
                body,
                hashlib.sha256
            ).hexdigest()
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                await client.post(
                    subscriber_url,
                    content=body,
                    headers={
                        "Content-Type": "application/json",
                        "X-AgenticTrust-Signature": f"sha256={signature}"
                    }
                )
        except Exception as e:
            # Log error but don't fail
            print(f"Failed to deliver event to {subscriber_url}: {e}")


@router.post("/events", response_model=InternalEventResponse)
async def receive_internal_event(
    request: Request,
    background_tasks: BackgroundTasks
):
    """
    Receive internal events from AAV, Safe-Spend, and other AgenticTrust tools.
    
    Events are authenticated via HMAC-SHA256 signature in X-AgenticTrust-Signature header.
    
    Supported event types:
    - aav.verification.authorized: AAV approved an action
    - aav.verification.denied: AAV denied an action
    - safe_spend.spend.approved: Safe-Spend approved a transaction
    - safe_spend.spend.denied: Safe-Spend denied a transaction
    - safe_spend.spend.expired: Safe-Spend request expired
    """
    body = await request.body()
    signature = request.headers.get("X-AgenticTrust-Signature", "")
    
    if not verify_hmac_signature(body, signature):
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing signature"
        )
    
    try:
        event_data = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    event_type = event_data.get("event_type", "")
    uaid = event_data.get("uaid", "")
    org_id = event_data.get("org_id")
    data = event_data.get("data", {})
    event_id = event_data.get("id")
    
    if not uaid:
        raise HTTPException(status_code=400, detail="Missing uaid")
    
    outcome_id = None
    
    # Handle AAV verification events
    if event_type == "aav.verification.authorized":
        outcome_id = await auto_log_outcome(
            uaid=uaid,
            result="success",
            task_type=f"aav_verify:{data.get('action', 'unknown')}",
            source="aav",
            source_event_id=data.get("verification_id"),
            metadata=data
        )
    
    elif event_type == "aav.verification.denied":
        outcome_id = await auto_log_outcome(
            uaid=uaid,
            result="failure",
            task_type=f"aav_verify:{data.get('action', 'unknown')}",
            source="aav",
            source_event_id=data.get("verification_id"),
            metadata=data
        )
    
    # Handle Safe-Spend events
    elif event_type.startswith("safe_spend.spend."):
        status = event_type.split(".")[-1]  # approved, denied, expired
        result_map = {
            "approved": "success",
            "denied": "failure",
            "expired": "timeout"
        }
        outcome_id = await auto_log_outcome(
            uaid=uaid,
            result=result_map.get(status, "failure"),
            task_type=f"safe_spend:{status}",
            source="safe_spend",
            source_event_id=data.get("spend_request_id"),
            metadata=data
        )
    
    return InternalEventResponse(
        received=True,
        event_id=event_id,
        outcome_id=outcome_id
    )


# Cross-reference lookup endpoints

@router.get("/agents/by-certificate/{certificate_id}")
async def get_agent_by_certificate(certificate_id: str):
    """Look up an agent by its AAV certificate ID."""
    agent = await db.agents.find_one(
        {"aav_certificate_id": certificate_id},
        {"_id": 0}
    )
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found for certificate")
    
    # Get outcomes for score calculation
    from services.score_service import calculate_score_and_tier
    outcomes = await db.outcomes.find(
        {"agent_id": agent["agent_id"]},
        {"_id": 0}
    ).to_list(10000)
    score, tier, success_rate, _ = calculate_score_and_tier(outcomes)
    
    return {
        "agent_id": agent["agent_id"],
        "name": agent["name"],
        "description": agent.get("description"),
        "organization_id": agent.get("organization_id"),
        "aav_certificate_id": agent.get("aav_certificate_id"),
        "safe_spend_escrow_id": agent.get("safe_spend_escrow_id"),
        "score": score,
        "tier": tier,
        "outcome_count": len(outcomes),
        "success_rate": success_rate,
        "is_public": agent.get("is_public", False),
        "created_at": agent["created_at"]
    }


@router.get("/agents/by-escrow/{escrow_id}")
async def get_agent_by_escrow(escrow_id: str):
    """Look up an agent by its Safe-Spend escrow ID."""
    agent = await db.agents.find_one(
        {"safe_spend_escrow_id": escrow_id},
        {"_id": 0}
    )
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found for escrow")
    
    # Get outcomes for score calculation
    from services.score_service import calculate_score_and_tier
    outcomes = await db.outcomes.find(
        {"agent_id": agent["agent_id"]},
        {"_id": 0}
    ).to_list(10000)
    score, tier, success_rate, _ = calculate_score_and_tier(outcomes)
    
    return {
        "agent_id": agent["agent_id"],
        "name": agent["name"],
        "description": agent.get("description"),
        "organization_id": agent.get("organization_id"),
        "aav_certificate_id": agent.get("aav_certificate_id"),
        "safe_spend_escrow_id": agent.get("safe_spend_escrow_id"),
        "score": score,
        "tier": tier,
        "outcome_count": len(outcomes),
        "success_rate": success_rate,
        "is_public": agent.get("is_public", False),
        "created_at": agent["created_at"]
    }
