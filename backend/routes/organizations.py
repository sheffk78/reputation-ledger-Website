"""
Organization and Batch Score API endpoints.

This module provides:
- Organization linking via AAV link tokens
- Batch score lookups for cross-tool consumption
- Organization score summaries
- Control plane readiness endpoints
"""
import os
import secrets
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel

from core.database import db
from core.dependencies import get_user_from_api_key, get_current_user
from services.score_service import calculate_score_and_tier

router = APIRouter(tags=["organizations"])

# Environment variables
AAV_API_URL = os.environ.get("AAV_API_URL", "")
AAV_MOCK_MODE = os.environ.get("AAV_MOCK_MODE", "").lower() == "true"


# ============================================================
# Request/Response Models
# ============================================================

class OrgLinkRequest(BaseModel):
    link_token: str


class OrgLinkResponse(BaseModel):
    linked: bool
    organization_id: str
    agents_updated: int


class BatchScoreRequest(BaseModel):
    uaids: List[str]


class AgentScoreInfo(BaseModel):
    score: float
    tier: str
    outcome_count: int
    success_rate: float


class BatchScoreResponse(BaseModel):
    scores: Dict[str, AgentScoreInfo]
    not_found: List[str]


class OrgScoreSummary(BaseModel):
    organization_id: str
    agent_count: int
    average_score: float
    tier_distribution: Dict[str, int]
    total_outcomes: int
    overall_success_rate: float


class OrgToolSummary(BaseModel):
    tool: str = "arl"
    org_id: str
    total_agents: int
    average_score: float
    tier_distribution: Dict[str, int]
    total_outcomes: int
    outcomes_this_week: int
    overall_success_rate: float


class AgentCardData(BaseModel):
    tool: str = "arl"
    agent_id: str
    reputation: Dict[str, Any]


# ============================================================
# Organization Linking
# ============================================================

@router.post("/org/link", response_model=OrgLinkResponse)
async def link_organization(
    data: OrgLinkRequest,
    request: Request,
    user: dict = Depends(get_current_user)
):
    """
    Link user account and all agents to an organization via AAV link token.
    
    The link_token is obtained from AAV and validates the organization membership.
    
    Modes:
    - Production: Validates token with real AAV service (AAV_API_URL set)
    - Mock Mode: Uses internal mock AAV endpoint (AAV_MOCK_MODE=true)
    - Dev Mode: Extracts org_id from token format lnk_org_XXX
    """
    link_token = data.link_token
    
    # Validate link token format
    if not link_token.startswith("lnk_"):
        raise HTTPException(
            status_code=400,
            detail="Invalid link token format. Expected lnk_... format."
        )
    
    organization_id = None
    
    # Production mode: Use real AAV service
    if AAV_API_URL:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{AAV_API_URL}/api/v1/org/validate-link",
                    json={"link_token": link_token}
                )
                if response.status_code == 200:
                    result = response.json()
                    organization_id = result.get("organization_id")
                else:
                    raise HTTPException(
                        status_code=400,
                        detail="Invalid or expired link token"
                    )
        except httpx.RequestError:
            raise HTTPException(
                status_code=503,
                detail="Unable to validate link token with AAV"
            )
    
    # Mock mode: Use internal mock AAV endpoint
    elif AAV_MOCK_MODE:
        # Use localhost since we're calling our own service
        # The mock endpoint is registered on the same FastAPI app
        internal_url = "http://127.0.0.1:8001"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{internal_url}/api/mock/aav/org/validate-link",
                    json={"link_token": link_token}
                )
                if response.status_code == 200:
                    result = response.json()
                    organization_id = result.get("organization_id")
                else:
                    # Safely parse error response
                    try:
                        error_data = response.json()
                        error = error_data.get("detail", "Invalid token")
                    except Exception:
                        error = f"Invalid token (status {response.status_code})"
                    raise HTTPException(status_code=400, detail=error)
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=503,
                detail=f"Unable to validate link token: {str(e)}"
            )
    
    # Development mode: Extract org_id from token format
    else:
        # Format: lnk_org_XXXXXXXXXXXX_random
        parts = link_token.split("_")
        if len(parts) >= 3 and parts[1] == "org":
            organization_id = f"org_{parts[2]}"
        else:
            # Generate a mock org_id for testing
            organization_id = f"org_{secrets.token_hex(6)}"
    
    if not organization_id:
        raise HTTPException(status_code=400, detail="Could not determine organization ID")
    
    # Update user with organization_id
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"organization_id": organization_id}}
    )
    
    # Update all user's agents with organization_id
    result = await db.agents.update_many(
        {"user_id": user["id"]},
        {"$set": {"organization_id": organization_id}}
    )
    
    return OrgLinkResponse(
        linked=True,
        organization_id=organization_id,
        agents_updated=result.modified_count
    )


# ============================================================
# Batch Score Endpoint
# ============================================================

@router.post("/agents/scores/batch", response_model=BatchScoreResponse)
async def get_batch_scores(
    data: BatchScoreRequest,
    user: dict = Depends(get_user_from_api_key)
):
    """
    Get scores for multiple agents in a single request.
    
    Rate limit: 30 requests/minute
    Max UAIDs per request: 100
    """
    uaids = data.uaids[:100]  # Limit to 100 agents
    
    scores = {}
    not_found = []
    
    for uaid in uaids:
        # Check if agent exists and user has access
        agent = await db.agents.find_one(
            {"agent_id": uaid, "user_id": user["id"]},
            {"_id": 0}
        )
        
        # If not found for user, check if it's public
        if not agent:
            agent = await db.agents.find_one(
                {"agent_id": uaid, "is_public": True},
                {"_id": 0}
            )
        
        if not agent:
            not_found.append(uaid)
            continue
        
        # Get outcomes and calculate score
        outcomes = await db.outcomes.find(
            {"agent_id": uaid},
            {"_id": 0}
        ).to_list(10000)
        
        score, tier, success_rate, _ = calculate_score_and_tier(outcomes)
        
        scores[uaid] = AgentScoreInfo(
            score=score,
            tier=tier,
            outcome_count=len(outcomes),
            success_rate=success_rate
        )
    
    return BatchScoreResponse(
        scores=scores,
        not_found=not_found
    )


# ============================================================
# Organization Score Summary
# ============================================================

@router.get("/organizations/{org_id}/score-summary", response_model=OrgScoreSummary)
async def get_org_score_summary(
    org_id: str,
    user: dict = Depends(get_user_from_api_key)
):
    """
    Get aggregated score summary for an organization.
    
    User must have access to at least one agent in the organization,
    or the organization must have public agents.
    """
    # Find all agents in the organization that user has access to or are public
    query = {
        "organization_id": org_id,
        "$or": [
            {"user_id": user["id"]},
            {"is_public": True}
        ]
    }
    
    agents = await db.agents.find(query, {"_id": 0}).to_list(10000)
    
    if not agents:
        raise HTTPException(
            status_code=404,
            detail="Organization not found or no accessible agents"
        )
    
    # Calculate aggregated stats
    total_outcomes = 0
    total_successes = 0
    scores = []
    tier_distribution = {"Platinum": 0, "Gold": 0, "Silver": 0, "Bronze": 0, "Unrated": 0}
    
    for agent in agents:
        outcomes = await db.outcomes.find(
            {"agent_id": agent["agent_id"]},
            {"_id": 0}
        ).to_list(10000)
        
        score, tier, success_rate, _ = calculate_score_and_tier(outcomes)
        
        total_outcomes += len(outcomes)
        total_successes += len([o for o in outcomes if o.get("result") == "success"])
        
        if score > 0 or len(outcomes) > 0:
            scores.append(score)
        
        if tier in tier_distribution:
            tier_distribution[tier] += 1
    
    average_score = sum(scores) / len(scores) if scores else 0
    overall_success_rate = (total_successes / total_outcomes * 100) if total_outcomes > 0 else 0
    
    return OrgScoreSummary(
        organization_id=org_id,
        agent_count=len(agents),
        average_score=round(average_score, 1),
        tier_distribution=tier_distribution,
        total_outcomes=total_outcomes,
        overall_success_rate=round(overall_success_rate, 1)
    )


# ============================================================
# Control Plane Readiness Endpoints
# ============================================================

@router.get("/org/{org_id}/summary", response_model=OrgToolSummary)
async def get_org_tool_summary(org_id: str):
    """
    Get organization summary for control plane consumption.
    
    This endpoint will be consumed by agentictrust.app.
    """
    # Find all agents in the organization
    agents = await db.agents.find(
        {"organization_id": org_id},
        {"_id": 0}
    ).to_list(10000)
    
    if not agents:
        raise HTTPException(
            status_code=404,
            detail="Organization not found"
        )
    
    # Calculate aggregated stats
    total_outcomes = 0
    outcomes_this_week = 0
    total_successes = 0
    scores = []
    tier_distribution = {"Platinum": 0, "Gold": 0, "Silver": 0, "Bronze": 0, "Unrated": 0}
    
    # Week boundary for recent outcomes
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    
    for agent in agents:
        outcomes = await db.outcomes.find(
            {"agent_id": agent["agent_id"]},
            {"_id": 0}
        ).to_list(10000)
        
        score, tier, success_rate, _ = calculate_score_and_tier(outcomes)
        
        total_outcomes += len(outcomes)
        total_successes += len([o for o in outcomes if o.get("result") == "success"])
        outcomes_this_week += len([o for o in outcomes if o.get("created_at", "") >= week_ago])
        
        if score > 0 or len(outcomes) > 0:
            scores.append(score)
        
        if tier in tier_distribution:
            tier_distribution[tier] += 1
    
    average_score = sum(scores) / len(scores) if scores else 0
    overall_success_rate = (total_successes / total_outcomes * 100) if total_outcomes > 0 else 0
    
    return OrgToolSummary(
        tool="arl",
        org_id=org_id,
        total_agents=len(agents),
        average_score=round(average_score, 1),
        tier_distribution=tier_distribution,
        total_outcomes=total_outcomes,
        outcomes_this_week=outcomes_this_week,
        overall_success_rate=round(overall_success_rate, 1)
    )


@router.get("/agents/{agent_id}/card-data", response_model=AgentCardData)
async def get_agent_card_data(agent_id: str):
    """
    Get agent card data for control plane consumption.
    
    This endpoint provides a standardized response format for
    displaying agent reputation cards across AgenticTrust tools.
    """
    agent = await db.agents.find_one(
        {"agent_id": agent_id},
        {"_id": 0}
    )
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Get outcomes and calculate score
    outcomes = await db.outcomes.find(
        {"agent_id": agent_id},
        {"_id": 0}
    ).to_list(10000)
    
    score, tier, success_rate, _ = calculate_score_and_tier(outcomes)
    
    # Build profile URL
    base_url = os.environ.get("PUBLIC_URL", "https://repledger.agentictrust.app")
    
    return AgentCardData(
        tool="arl",
        agent_id=agent_id,
        reputation={
            "score": score,
            "tier": tier,
            "outcome_count": len(outcomes),
            "success_rate": success_rate,
            "profile_url": f"{base_url}/a/{agent_id}",
            "badge_url": f"{base_url}/api/v1/agents/{agent_id}/badge.svg"
        }
    )



# ============================================================
# CONFIG ENDPOINT FOR FRONTEND
# ============================================================

SAFE_SPEND_API_URL = os.environ.get("SAFE_SPEND_API_URL", "")


class ToolConfig(BaseModel):
    """Configuration for a sister tool"""
    enabled: bool
    api_url: Optional[str] = None
    name: str


class ConfigResponse(BaseModel):
    """System configuration for frontend"""
    tool: str = "arl"
    version: str = "1.0.0"
    sister_tools: Dict[str, ToolConfig]
    features: Dict[str, bool]


@router.get("/config", response_model=ConfigResponse)
async def get_config():
    """
    Get system configuration for frontend.
    
    Returns which sister tools are enabled and available features.
    Frontend uses this to conditionally render cross-tool UI elements.
    """
    return ConfigResponse(
        tool="arl",
        version="1.0.0",
        sister_tools={
            "aav": ToolConfig(
                enabled=bool(AAV_API_URL),
                api_url=AAV_API_URL if AAV_API_URL else None,
                name="Agent Authority Vault"
            ),
            "safe_spend": ToolConfig(
                enabled=bool(SAFE_SPEND_API_URL),
                api_url=SAFE_SPEND_API_URL if SAFE_SPEND_API_URL else None,
                name="Safe-Spend"
            )
        },
        features={
            "org_linking": True,
            "batch_scores": True,
            "cross_tool_events": True,
            "outcome_sources": True
        }
    )
