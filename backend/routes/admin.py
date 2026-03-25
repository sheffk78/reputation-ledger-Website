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
from core.exceptions import APIError, ErrorCodes
from services.score_service import calculate_score_and_tier
from models.audit import AuditLogEntry, AuditLogListResponse

router = APIRouter(prefix="/admin", tags=["admin"])


# ============== RESPONSE MODELS ==============

class AdminUserResponse(BaseModel):
    id: str
    email: str
    is_admin: bool
    created_at: str
    last_login_at: Optional[str] = None
    agent_count: int = 0
    outcome_count: int = 0


class AdminUserListResponse(BaseModel):
    users: List[AdminUserResponse]
    total: int


class AdminUserAgentResponse(BaseModel):
    """Agent info for user detail view"""
    agent_id: str
    name: str
    description: Optional[str] = None
    score: float
    tier: str
    outcome_count: int
    is_public: bool
    created_at: str


class AdminUserDetailResponse(BaseModel):
    """Detailed user info with their agents"""
    id: str
    email: str
    is_admin: bool
    created_at: str
    last_login_at: Optional[str] = None
    agent_count: int
    outcome_count: int
    agents: List[AdminUserAgentResponse]


class AdminAgentResponse(BaseModel):
    agent_id: str
    name: str
    description: Optional[str] = None
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


class AdminOutcomeResponse(BaseModel):
    """Outcome for admin view"""
    id: str
    result: str
    task_type: str
    submitter_type: str
    created_at: str


class AdminFlagResponse(BaseModel):
    """Flag for admin view"""
    id: str
    outcome_id: Optional[str] = None
    reason: str
    notes: Optional[str] = None
    created_by_user_id: str
    created_at: str


class AdminAgentDetailResponse(BaseModel):
    """Detailed agent info for admin view"""
    agent_id: str
    name: str
    description: Optional[str] = None
    owner_handle: Optional[str] = None
    owner_id: str
    owner_email: str
    score: float
    tier: str
    outcome_count: int
    success_rate: float
    is_public: bool
    created_at: str
    breakdown: dict
    recent_outcomes: List[AdminOutcomeResponse]
    flags: List[AdminFlagResponse]
    flags_count: int


class AdminStatsResponse(BaseModel):
    total_users: int
    total_agents: int
    total_outcomes: int
    outcomes_last_7_days: int
    outcomes_last_24_hours: int
    new_users_last_7_days: int


# ============== API KEY MODELS ==============

class AdminApiKeyResponse(BaseModel):
    """API key info for admin view"""
    id: str
    user_id: str
    user_email: str
    partial_key: str
    status: str  # "active" or "revoked"
    created_at: str
    last_used_at: Optional[str] = None


class AdminApiKeyListResponse(BaseModel):
    """Paginated list of API keys"""
    api_keys: List[AdminApiKeyResponse]
    total: int


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
            last_login_at=user.get("last_login_at"),
            agent_count=agent_count,
            outcome_count=outcome_count
        ))
    
    return AdminUserListResponse(users=result, total=total)


@router.get("/users/{user_id}", response_model=AdminUserDetailResponse)
async def get_user_detail(user_id: str, admin: dict = Depends(get_admin_user)):
    """Get detailed info for a single user including their agents (admin only)"""
    from core.exceptions import APIError, ErrorCodes
    
    user = await db.users.find_one(
        {"id": user_id}, 
        {"_id": 0, "password_hash": 0}
    )
    
    if not user:
        raise APIError(
            code=ErrorCodes.USER_NOT_FOUND,
            message=f"User '{user_id}' not found.",
            status_code=404
        )
    
    # Get all agents for this user with their scores
    agents_cursor = db.agents.find(
        {"user_id": user_id}, 
        {"_id": 0}
    ).sort("created_at", -1)
    agents = await agents_cursor.to_list(1000)
    
    user_agents = []
    total_outcomes = 0
    
    for agent in agents:
        # Get outcomes and calculate score
        outcomes = await db.outcomes.find(
            {"agent_id": agent["agent_id"]}, 
            {"_id": 0, "result": 1}
        ).to_list(10000)
        
        score, tier, _, _ = calculate_score_and_tier(outcomes)
        outcome_count = len(outcomes)
        total_outcomes += outcome_count
        
        user_agents.append(AdminUserAgentResponse(
            agent_id=agent["agent_id"],
            name=agent["name"],
            description=agent.get("description"),
            score=score,
            tier=tier,
            outcome_count=outcome_count,
            is_public=agent.get("is_public", False),
            created_at=agent["created_at"]
        ))
    
    return AdminUserDetailResponse(
        id=user["id"],
        email=user["email"],
        is_admin=user.get("is_admin", False),
        created_at=user["created_at"],
        last_login_at=user.get("last_login_at"),
        agent_count=len(agents),
        outcome_count=total_outcomes,
        agents=user_agents
    )


@router.get("/agents", response_model=AdminAgentListResponse)
async def list_all_agents(
    limit: int = 50,
    skip: int = 0,
    tier: Optional[str] = None,
    is_public: Optional[bool] = None,
    admin: dict = Depends(get_admin_user)
):
    """List all agents across all users with optional filtering (admin only)"""
    # Build filter query
    query = {}
    if is_public is not None:
        query["is_public"] = is_public
    
    total = await db.agents.count_documents(query)
    
    agents = await db.agents.find(
        query, 
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
        
        score, agent_tier, _, _ = calculate_score_and_tier(outcomes)
        
        # Apply tier filter if specified (post-query since tier is computed)
        if tier and agent_tier != tier:
            continue
        
        result.append(AdminAgentResponse(
            agent_id=agent["agent_id"],
            name=agent["name"],
            description=agent.get("description"),
            owner_email=owner_email,
            owner_id=agent["user_id"],
            score=score,
            tier=agent_tier,
            outcome_count=len(outcomes),
            is_public=agent.get("is_public", False),
            created_at=agent["created_at"]
        ))
    
    # Adjust total if tier filter was applied
    if tier:
        total = len(result)
    
    return AdminAgentListResponse(agents=result, total=total)


@router.get("/agents/{agent_id}", response_model=AdminAgentDetailResponse)
async def get_agent_detail(agent_id: str, admin: dict = Depends(get_admin_user)):
    """Get detailed info for a single agent (admin only)"""
    from core.exceptions import APIError, ErrorCodes
    
    agent = await db.agents.find_one({"agent_id": agent_id}, {"_id": 0})
    
    if not agent:
        raise APIError(
            code=ErrorCodes.AGENT_NOT_FOUND,
            message=f"Agent '{agent_id}' not found.",
            status_code=404
        )
    
    # Get owner info
    owner = await db.users.find_one({"id": agent["user_id"]}, {"_id": 0, "email": 1})
    owner_email = owner["email"] if owner else "unknown"
    
    # Get all outcomes for score calculation
    all_outcomes = await db.outcomes.find(
        {"agent_id": agent_id}, 
        {"_id": 0}
    ).to_list(10000)
    
    score, tier, success_rate, breakdown = calculate_score_and_tier(all_outcomes)
    
    # Get recent outcomes (last 20)
    recent_outcomes_raw = await db.outcomes.find(
        {"agent_id": agent_id}, 
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    recent_outcomes = [
        AdminOutcomeResponse(
            id=o["id"],
            result=o["result"],
            task_type=o["task_type"],
            submitter_type=o["submitter_type"],
            created_at=o["created_at"]
        ) for o in recent_outcomes_raw
    ]
    
    # Get flags
    flags_raw = await db.flags.find(
        {"agent_id": agent_id}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    flags = [
        AdminFlagResponse(
            id=f["id"],
            outcome_id=f.get("outcome_id"),
            reason=f["reason"],
            notes=f.get("notes"),
            created_by_user_id=f["created_by_user_id"],
            created_at=f["created_at"]
        ) for f in flags_raw
    ]
    
    return AdminAgentDetailResponse(
        agent_id=agent["agent_id"],
        name=agent["name"],
        description=agent.get("description"),
        owner_handle=agent.get("owner_handle"),
        owner_id=agent["user_id"],
        owner_email=owner_email,
        score=score,
        tier=tier,
        outcome_count=len(all_outcomes),
        success_rate=success_rate,
        is_public=agent.get("is_public", False),
        created_at=agent["created_at"],
        breakdown=breakdown,
        recent_outcomes=recent_outcomes,
        flags=flags,
        flags_count=len(flags)
    )


@router.get("/api-keys", response_model=AdminApiKeyListResponse)
async def list_all_api_keys(
    limit: int = 50,
    skip: int = 0,
    status: Optional[str] = None,  # "active" or "revoked"
    admin: dict = Depends(get_admin_user)
):
    """List all API keys with user info (admin only)"""
    # Build filter query
    query = {}
    if status == "active":
        query["revoked_at"] = None
    elif status == "revoked":
        query["revoked_at"] = {"$ne": None}
    
    total = await db.api_keys.count_documents(query)
    
    api_keys = await db.api_keys.find(
        query, 
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    result = []
    for key in api_keys:
        # Get user email
        user = await db.users.find_one({"id": key["user_id"]}, {"_id": 0, "email": 1})
        user_email = user["email"] if user else "unknown"
        
        # Create partial key (show last 6 characters)
        full_key = key["key"]
        partial_key = f"...{full_key[-6:]}" if len(full_key) > 6 else full_key
        
        # Determine status
        key_status = "revoked" if key.get("revoked_at") else "active"
        
        result.append(AdminApiKeyResponse(
            id=key["id"],
            user_id=key["user_id"],
            user_email=user_email,
            partial_key=partial_key,
            status=key_status,
            created_at=key["created_at"],
            last_used_at=key.get("last_used_at")
        ))
    
    return AdminApiKeyListResponse(api_keys=result, total=total)


@router.get("/me")
async def get_admin_me(admin: dict = Depends(get_admin_user)):
    """Verify admin access and get current admin user info"""
    return {
        "id": admin["id"],
        "email": admin["email"],
        "is_admin": True
    }


@router.delete("/agents/{agent_id}", status_code=204)
async def admin_delete_agent(
    agent_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Delete any agent (admin only)"""
    # Verify agent exists
    agent = await db.agents.find_one({"agent_id": agent_id}, {"_id": 0})
    
    if not agent:
        raise APIError(
            code=ErrorCodes.AGENT_NOT_FOUND,
            message=f"Agent '{agent_id}' not found.",
            status_code=404,
            details={"agent_id": agent_id}
        )
    
    # Delete associated data
    await db.outcomes.delete_many({"agent_id": agent_id})
    await db.flags.delete_many({"agent_id": agent_id})
    
    # Delete the agent
    await db.agents.delete_one({"agent_id": agent_id})
    
    return None


@router.get("/audit-logs", response_model=AuditLogListResponse)
async def list_audit_logs(
    page: int = 1,
    limit: int = 50,
    event_type: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """
    List audit logs with pagination (admin only).
    
    Query params:
    - page: Page number (1-indexed)
    - limit: Items per page (default 50, max 100)
    - event_type: Optional filter by event type
    """
    # Enforce limits
    limit = min(limit, 100)
    skip = (page - 1) * limit
    
    # Build filter query
    query = {}
    if event_type:
        query["event_type"] = event_type
    
    total = await db.audit_logs.count_documents(query)
    
    logs = await db.audit_logs.find(
        query,
        {"_id": 0}
    ).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    
    result = [
        AuditLogEntry(
            id=log["id"],
            timestamp=log["timestamp"],
            actor_type=log["actor_type"],
            actor_id=log.get("actor_id"),
            actor_email=log.get("actor_email"),
            event_type=log["event_type"],
            metadata=log.get("metadata", {}),
            description=log.get("description")
        )
        for log in logs
    ]
    
    return AuditLogListResponse(
        logs=result,
        page=page,
        limit=limit,
        total=total
    )
