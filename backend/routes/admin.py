"""
Admin API Routes

All routes in this module require admin access.
Admin users are identified by the `is_admin: true` field on their user document.

To promote a user to admin via MongoDB shell:
    db.users.updateOne({email: "admin@example.com"}, {$set: {is_admin: true}})
"""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional

from core.database import db
from core.dependencies import get_admin_user
from services.score_service import calculate_score_and_tier

router = APIRouter(prefix="/admin", tags=["admin"])


# ============== RESPONSE MODELS ==============

class AdminUserResponse(BaseModel):
    id: str
    email: str
    is_admin: bool
    created_at: str
    agent_count: int = 0
    outcome_count: int = 0


class AdminUserListResponse(BaseModel):
    users: List[AdminUserResponse]
    total: int


class AdminAgentResponse(BaseModel):
    agent_id: str
    name: str
    owner_email: str
    owner_id: str
    score: float
    tier: str
    outcome_count: int
    is_public: bool
    created_at: str


class AdminAgentListResponse(BaseModel):
    agents: List[AdminAgentResponse]
    total: int


class AdminStatsResponse(BaseModel):
    total_users: int
    total_agents: int
    total_outcomes: int
    outcomes_last_7_days: int
    outcomes_last_24_hours: int
    new_users_last_7_days: int


# ============== ADMIN ROUTES ==============

@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(admin: dict = Depends(get_admin_user)):
    """Get platform-wide statistics (admin only)"""
    now = datetime.now(timezone.utc)
    seven_days_ago = (now - timedelta(days=7)).isoformat()
    twenty_four_hours_ago = (now - timedelta(hours=24)).isoformat()
    
    total_users = await db.users.count_documents({})
    total_agents = await db.agents.count_documents({})
    total_outcomes = await db.outcomes.count_documents({})
    
    outcomes_last_7_days = await db.outcomes.count_documents({
        "created_at": {"$gte": seven_days_ago}
    })
    
    outcomes_last_24_hours = await db.outcomes.count_documents({
        "created_at": {"$gte": twenty_four_hours_ago}
    })
    
    new_users_last_7_days = await db.users.count_documents({
        "created_at": {"$gte": seven_days_ago}
    })
    
    return AdminStatsResponse(
        total_users=total_users,
        total_agents=total_agents,
        total_outcomes=total_outcomes,
        outcomes_last_7_days=outcomes_last_7_days,
        outcomes_last_24_hours=outcomes_last_24_hours,
        new_users_last_7_days=new_users_last_7_days
    )


@router.get("/users", response_model=AdminUserListResponse)
async def list_all_users(
    limit: int = 50,
    skip: int = 0,
    admin: dict = Depends(get_admin_user)
):
    """List all users with their stats (admin only)"""
    total = await db.users.count_documents({})
    
    users = await db.users.find(
        {}, 
        {"_id": 0, "password_hash": 0}  # Exclude sensitive fields
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    result = []
    for user in users:
        # Get agent count
        agent_count = await db.agents.count_documents({"user_id": user["id"]})
        
        # Get outcome count for this user's agents
        agents = await db.agents.find(
            {"user_id": user["id"]}, 
            {"agent_id": 1, "_id": 0}
        ).to_list(1000)
        agent_ids = [a["agent_id"] for a in agents]
        outcome_count = await db.outcomes.count_documents({"agent_id": {"$in": agent_ids}}) if agent_ids else 0
        
        result.append(AdminUserResponse(
            id=user["id"],
            email=user["email"],
            is_admin=user.get("is_admin", False),
            created_at=user["created_at"],
            agent_count=agent_count,
            outcome_count=outcome_count
        ))
    
    return AdminUserListResponse(users=result, total=total)


@router.get("/agents", response_model=AdminAgentListResponse)
async def list_all_agents(
    limit: int = 50,
    skip: int = 0,
    admin: dict = Depends(get_admin_user)
):
    """List all agents across all users (admin only)"""
    total = await db.agents.count_documents({})
    
    agents = await db.agents.find(
        {}, 
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    result = []
    for agent in agents:
        # Get owner info
        owner = await db.users.find_one({"id": agent["user_id"]}, {"_id": 0, "email": 1})
        owner_email = owner["email"] if owner else "unknown"
        
        # Get score
        outcomes = await db.outcomes.find(
            {"agent_id": agent["agent_id"]}, 
            {"_id": 0, "result": 1}
        ).to_list(10000)
        
        score, tier, _, _ = calculate_score_and_tier(outcomes)
        
        result.append(AdminAgentResponse(
            agent_id=agent["agent_id"],
            name=agent["name"],
            owner_email=owner_email,
            owner_id=agent["user_id"],
            score=score,
            tier=tier,
            outcome_count=len(outcomes),
            is_public=agent.get("is_public", False),
            created_at=agent["created_at"]
        ))
    
    return AdminAgentListResponse(agents=result, total=total)


@router.get("/me")
async def get_admin_me(admin: dict = Depends(get_admin_user)):
    """Verify admin access and get current admin user info"""
    return {
        "id": admin["id"],
        "email": admin["email"],
        "is_admin": True
    }
