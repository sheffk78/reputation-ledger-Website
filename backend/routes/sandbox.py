"""
Sandbox routes for RepLedger.

Public routes (no auth required):
  GET /api/sandbox/credentials — Get sandbox API key and demo agents
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from core.config import settings
from core.database import db
from services.score_service import calculate_score_and_tier

router = APIRouter(prefix="/sandbox", tags=["sandbox"])


class SandboxAgent(BaseModel):
    agent_id: str
    name: str
    description: Optional[str] = None
    score: float
    tier: str
    outcome_count: int
    success_rate: float


class SandboxCredentialsResponse(BaseModel):
    api_key: str
    masked_key: str
    agents: List[SandboxAgent]
    is_sandbox: bool
    note: str


@router.get("/credentials", response_model=SandboxCredentialsResponse)
async def get_sandbox_credentials():
    """
    Return sandbox credentials for the public playground.
    No authentication required.
    """
    if not settings.SANDBOX_API_KEY or not settings.SANDBOX_USER_ID:
        raise HTTPException(status_code=503, detail="Sandbox not configured")

    # Get sandbox agents
    agents = await db.agents.find(
        {"user_id": settings.SANDBOX_USER_ID},
        {"_id": 0}
    ).to_list(100)

    # Calculate scores for each agent
    agent_list = []
    agent_ids = [a["agent_id"] for a in agents]
    
    for agent in agents:
        outcomes = await db.outcomes.find(
            {"agent_id": agent["agent_id"]},
            {"_id": 0, "result": 1}
        ).to_list(10000)
        
        score, tier, success_rate, _ = calculate_score_and_tier(outcomes)
        agent_list.append(SandboxAgent(
            agent_id=agent["agent_id"],
            name=agent["name"],
            description=agent.get("description"),
            score=score,
            tier=tier,
            outcome_count=len(outcomes),
            success_rate=success_rate,
        ))

    # Clean up old sandbox outcomes (keep only the last 50 per agent)
    for agent_id in agent_ids:
        outcome_count = await db.outcomes.count_documents({"agent_id": agent_id})
        if outcome_count > 50:
            old_outcomes = await db.outcomes.find(
                {"agent_id": agent_id},
                {"_id": 1}
            ).sort("created_at", 1).limit(outcome_count - 50).to_list(outcome_count - 50)
            if old_outcomes:
                ids = [o["_id"] for o in old_outcomes]
                await db.outcomes.delete_many({"_id": {"$in": ids}})

    # Return masked key (show first 8 + last 4, mask the rest)
    key = settings.SANDBOX_API_KEY
    masked_key = f"{key[:8]}{'•' * 24}{key[-4:]}"

    return SandboxCredentialsResponse(
        api_key=settings.SANDBOX_API_KEY,
        masked_key=masked_key,
        agents=agent_list,
        is_sandbox=True,
        note="This is a shared sandbox environment. Data may be reset periodically."
    )
