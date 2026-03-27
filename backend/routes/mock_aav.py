"""
Mock AAV (Agent Authority Vault) endpoints for testing.

This module provides mock endpoints that simulate AAV's behavior for:
- Link token validation
- Cross-tool event reception

In production, these would be handled by the real AAV service.
Enable by setting AAV_MOCK_MODE=true in .env
"""
import os
import secrets
import hmac
import hashlib
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/mock/aav", tags=["mock-aav"])

# Mock database of valid link tokens (in production, AAV manages these)
MOCK_LINK_TOKENS: Dict[str, Dict[str, Any]] = {}


class LinkTokenValidateRequest(BaseModel):
    link_token: str


class LinkTokenValidateResponse(BaseModel):
    valid: bool
    organization_id: Optional[str] = None
    organization_name: Optional[str] = None
    expires_at: Optional[str] = None


class LinkTokenCreateRequest(BaseModel):
    organization_id: str
    organization_name: Optional[str] = "Test Organization"


class LinkTokenCreateResponse(BaseModel):
    link_token: str
    organization_id: str
    expires_at: str


class MockEventResponse(BaseModel):
    received: bool
    event_type: str


# ============================================================
# MOCK LINK TOKEN MANAGEMENT
# ============================================================

@router.post("/org/create-link-token", response_model=LinkTokenCreateResponse)
async def create_mock_link_token(data: LinkTokenCreateRequest):
    """
    Create a mock link token for testing org linking.
    
    In production, this would be handled by AAV's admin interface.
    """
    link_token = f"lnk_{secrets.token_hex(16)}"
    expires_at = datetime.now(timezone.utc).isoformat()
    
    # Store in mock database
    MOCK_LINK_TOKENS[link_token] = {
        "organization_id": data.organization_id,
        "organization_name": data.organization_name,
        "expires_at": expires_at,
        "used": False
    }
    
    return LinkTokenCreateResponse(
        link_token=link_token,
        organization_id=data.organization_id,
        expires_at=expires_at
    )


@router.post("/org/validate-link", response_model=LinkTokenValidateResponse)
async def validate_mock_link_token(data: LinkTokenValidateRequest):
    """
    Validate a link token (mock AAV endpoint).
    
    This is the endpoint that ARL calls to validate link tokens.
    In production, this lives on AAV's server.
    """
    link_token = data.link_token
    
    # Check if token exists in mock database
    token_data = MOCK_LINK_TOKENS.get(link_token)
    
    if not token_data:
        # For testing convenience, accept any lnk_org_XXX format
        if link_token.startswith("lnk_org_"):
            parts = link_token.split("_")
            if len(parts) >= 3:
                org_id = f"org_{parts[2]}"
                return LinkTokenValidateResponse(
                    valid=True,
                    organization_id=org_id,
                    organization_name="Auto-Generated Org"
                )
        
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired link token"
        )
    
    if token_data.get("used"):
        raise HTTPException(
            status_code=400,
            detail="Link token has already been used"
        )
    
    # Mark as used
    MOCK_LINK_TOKENS[link_token]["used"] = True
    
    return LinkTokenValidateResponse(
        valid=True,
        organization_id=token_data["organization_id"],
        organization_name=token_data["organization_name"],
        expires_at=token_data["expires_at"]
    )


# ============================================================
# MOCK INTERNAL EVENT RECEIVER (simulates AAV receiving events from ARL)
# ============================================================

# Store received events for inspection
RECEIVED_EVENTS: list = []


@router.post("/api/v1/internal/events", response_model=MockEventResponse)
async def receive_mock_event(request: Request):
    """
    Mock endpoint that receives internal events from ARL.
    
    This simulates how AAV would receive score change events.
    """
    body = await request.body()
    signature = request.headers.get("X-AgenticTrust-Signature", "")
    
    # Verify signature
    internal_secret = os.environ.get("INTERNAL_WEBHOOK_SECRET", "")
    if internal_secret:
        expected = f"sha256={hmac.new(internal_secret.encode(), body, hashlib.sha256).hexdigest()}"
        if not hmac.compare_digest(expected, signature):
            raise HTTPException(status_code=401, detail="Invalid signature")
    
    try:
        event = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    # Store event for inspection
    RECEIVED_EVENTS.append({
        "received_at": datetime.now(timezone.utc).isoformat(),
        "event": event
    })
    
    # Keep only last 100 events
    if len(RECEIVED_EVENTS) > 100:
        RECEIVED_EVENTS.pop(0)
    
    return MockEventResponse(
        received=True,
        event_type=event.get("event_type", "unknown")
    )


@router.get("/api/v1/internal/events/received")
async def get_received_events():
    """
    Get list of events received by the mock AAV.
    
    Useful for verifying that ARL is emitting events correctly.
    """
    return {
        "total": len(RECEIVED_EVENTS),
        "events": RECEIVED_EVENTS[-20:]  # Return last 20
    }


@router.delete("/api/v1/internal/events/received")
async def clear_received_events():
    """Clear the received events list."""
    RECEIVED_EVENTS.clear()
    return {"cleared": True}


# ============================================================
# MOCK SAFE-SPEND ENDPOINTS
# ============================================================

@router.post("/safe-spend/api/v1/internal/events", response_model=MockEventResponse)
async def receive_mock_safe_spend_event(request: Request):
    """
    Mock endpoint that receives internal events from ARL (Safe-Spend side).
    """
    body = await request.body()
    
    try:
        event = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    RECEIVED_EVENTS.append({
        "received_at": datetime.now(timezone.utc).isoformat(),
        "destination": "safe_spend",
        "event": event
    })
    
    return MockEventResponse(
        received=True,
        event_type=event.get("event_type", "unknown")
    )
