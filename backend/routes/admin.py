"""
Admin API Routes

All routes in this module require admin access.
Admin users are identified by the `is_admin: true` field on their user document.

Supports two authentication methods:
1. JWT token from browser login (user must have is_admin: true)
2. Static admin API key from ADMIN_API_KEY env var (for programmatic access by Kit)

To promote a user to admin via MongoDB shell:
    db.users.updateOne({email: "admin@example.com"}, {$set: {is_admin: true}})
"""
import uuid
import secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional

from core.database import db
from core.dependencies import get_admin_user
from core.exceptions import APIError, ErrorCodes
from services.score_service import calculate_score_and_tier
from models.audit import AuditLogEntry, AuditLogListResponse
from utils.password import hash_password

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


# ============== CREATE USER MODELS ==============

class AdminCreateUserRequest(BaseModel):
    """Request to create a new user via admin API"""
    email: EmailStr
    password: str = Field(..., min_length=8)
    is_admin: bool = False


class AdminCreateUserResponse(BaseModel):
    """Response from creating a user"""
    id: str
    email: str
    is_admin: bool
    created_at: str
    api_key: str  # Auto-generated API key


# ============== FULL SETUP MODELS ==============

class FullSetupAgentInput(BaseModel):
    """Agent to create in full setup"""
    name: str
    description: Optional[str] = None
    is_public: bool = False


class FullSetupWebhookInput(BaseModel):
    """Webhook to create in full setup"""
    url: str
    events: List[str] = ["outcome.created"]
    description: Optional[str] = None


class AdminFullSetupRequest(BaseModel):
    """Request to create user + agents + webhooks in one call"""
    email: EmailStr
    password: str = Field(..., min_length=8)
    agents: List[FullSetupAgentInput] = []
    webhooks: List[FullSetupWebhookInput] = []


class FullSetupAgentResult(BaseModel):
    """Agent created in full setup"""
    agent_id: str
    name: str


class AdminFullSetupResponse(BaseModel):
    """Response from full setup"""
    user_id: str
    email: str
    api_key: str
    agents: List[FullSetupAgentResult]
    webhooks_created: int


# ============== LOOKUP MODELS ==============

class AdminUserLookupResponse(BaseModel):
    """Minimal user info for lookups"""
    id: str
    email: str
    is_admin: bool
    agent_count: int
    created_at: str


class AdminAgentLookupResponse(BaseModel):
    """Minimal agent info for lookups"""
    agent_id: str
    name: str
    owner_id: str
    owner_email: str
    score: float
    tier: str
    outcome_count: int
    is_public: bool
    created_at: str


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


# ============== USER MANAGEMENT ==============

class AdminToggleUserRole(BaseModel):
    """Request to toggle user's admin status"""
    is_admin: bool


class AdminUpdateAgent(BaseModel):
    """Request to update agent details"""
    name: Optional[str] = None
    description: Optional[str] = None


@router.patch("/users/{user_id}/role", response_model=AdminUserResponse)
async def admin_toggle_user_role(
    user_id: str,
    data: AdminToggleUserRole,
    admin: dict = Depends(get_admin_user)
):
    """Toggle a user's admin status (admin only)"""
    # Prevent admin from demoting themselves
    if user_id == admin["id"] and not data.is_admin:
        raise APIError(
            code=ErrorCodes.VALIDATION_ERROR,
            message="You cannot remove your own admin privileges.",
            status_code=400,
            details={"user_id": user_id}
        )
    
    # Find user
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    
    if not user:
        raise APIError(
            code=ErrorCodes.USER_NOT_FOUND,
            message=f"User '{user_id}' not found.",
            status_code=404,
            details={"user_id": user_id}
        )
    
    # Update admin status
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_admin": data.is_admin}}
    )
    
    # Get updated stats
    agent_count = await db.agents.count_documents({"user_id": user_id})
    agents = await db.agents.find(
        {"user_id": user_id}, 
        {"agent_id": 1, "_id": 0}
    ).to_list(1000)
    agent_ids = [a["agent_id"] for a in agents]
    outcome_count = await db.outcomes.count_documents({"agent_id": {"$in": agent_ids}}) if agent_ids else 0
    
    return AdminUserResponse(
        id=user["id"],
        email=user["email"],
        is_admin=data.is_admin,
        created_at=user["created_at"],
        last_login_at=user.get("last_login_at"),
        agent_count=agent_count,
        outcome_count=outcome_count
    )


@router.delete("/users/{user_id}", status_code=204)
async def admin_delete_user(
    user_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Delete a user and all their data (admin only)"""
    # Prevent admin from deleting themselves
    if user_id == admin["id"]:
        raise APIError(
            code=ErrorCodes.VALIDATION_ERROR,
            message="You cannot delete your own account from admin panel.",
            status_code=400,
            details={"user_id": user_id}
        )
    
    # Find user
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    
    if not user:
        raise APIError(
            code=ErrorCodes.USER_NOT_FOUND,
            message=f"User '{user_id}' not found.",
            status_code=404,
            details={"user_id": user_id}
        )
    
    # Get all agents for this user
    agents = await db.agents.find(
        {"user_id": user_id}, 
        {"agent_id": 1, "_id": 0}
    ).to_list(1000)
    agent_ids = [a["agent_id"] for a in agents]
    
    # Delete all associated data
    if agent_ids:
        await db.outcomes.delete_many({"agent_id": {"$in": agent_ids}})
        await db.flags.delete_many({"agent_id": {"$in": agent_ids}})
        await db.agents.delete_many({"user_id": user_id})
    
    # Delete webhooks
    await db.webhooks.delete_many({"user_id": user_id})
    
    # Delete API keys
    await db.api_keys.delete_many({"user_id": user_id})
    
    # Delete the user
    await db.users.delete_one({"id": user_id})
    
    return None


@router.patch("/agents/{agent_id}", response_model=AdminAgentDetailResponse)
async def admin_update_agent(
    agent_id: str,
    data: AdminUpdateAgent,
    admin: dict = Depends(get_admin_user)
):
    """Update an agent's details (admin only)"""
    # Find agent
    agent = await db.agents.find_one({"agent_id": agent_id}, {"_id": 0})
    
    if not agent:
        raise APIError(
            code=ErrorCodes.AGENT_NOT_FOUND,
            message=f"Agent '{agent_id}' not found.",
            status_code=404,
            details={"agent_id": agent_id}
        )
    
    # Build update dict
    update_fields = {}
    if data.name is not None:
        update_fields["name"] = data.name
    if data.description is not None:
        update_fields["description"] = data.description
    
    if not update_fields:
        raise APIError(
            code=ErrorCodes.VALIDATION_ERROR,
            message="No fields to update provided.",
            status_code=400
        )
    
    # Update agent
    await db.agents.update_one(
        {"agent_id": agent_id},
        {"$set": update_fields}
    )
    
    # Return full agent detail response
    updated_agent = await db.agents.find_one({"agent_id": agent_id}, {"_id": 0})
    
    # Get owner info
    owner = await db.users.find_one({"id": updated_agent["user_id"]}, {"_id": 0, "email": 1})
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
        agent_id=updated_agent["agent_id"],
        name=updated_agent["name"],
        description=updated_agent.get("description"),
        owner_handle=updated_agent.get("owner_handle"),
        owner_id=updated_agent["user_id"],
        owner_email=owner_email,
        score=score,
        tier=tier,
        outcome_count=len(all_outcomes),
        success_rate=success_rate,
        is_public=updated_agent.get("is_public", False),
        created_at=updated_agent["created_at"],
        breakdown=breakdown,
        recent_outcomes=recent_outcomes,
        flags=flags,
        flags_count=len(flags)
    )


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



# ============== FEEDBACK MODELS ==============

class AdminFeedbackItemResponse(BaseModel):
    """Single feedback entry for admin view"""
    id: str
    user_id: Optional[str] = None
    user_email: str
    email_override: Optional[str] = None
    message: str
    created_at: str


class AdminFeedbackListResponse(BaseModel):
    """Paginated feedback list for admin"""
    feedback: List[AdminFeedbackItemResponse]
    page: int
    limit: int
    total: int


# ============== FEEDBACK ROUTES ==============

@router.get("/feedback", response_model=AdminFeedbackListResponse)
async def list_feedback(
    page: int = 1,
    limit: int = 50,
    admin: dict = Depends(get_admin_user)
):
    """
    List all user feedback with pagination (admin only).
    
    Query params:
    - page: Page number (1-indexed)
    - limit: Items per page (default 50, max 100)
    """
    # Enforce limits
    limit = min(limit, 100)
    skip = (page - 1) * limit
    
    total = await db.feedback.count_documents({})
    
    feedback_items = await db.feedback.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    result = [
        AdminFeedbackItemResponse(
            id=item["id"],
            user_id=item.get("user_id"),
            user_email=item.get("user_email", "unknown"),
            email_override=item.get("email_override"),
            message=item["message"],
            created_at=item["created_at"]
        )
        for item in feedback_items
    ]
    
    return AdminFeedbackListResponse(
        feedback=result,
        page=page,
        limit=limit,
        total=total
    )



# ============== ADMIN API KEY ROUTES ==============

@router.post("/users", response_model=AdminCreateUserResponse, status_code=201)
async def admin_create_user(
    data: AdminCreateUserRequest,
    admin: dict = Depends(get_admin_user)
):
    """
    Create a new user with an auto-generated API key.
    
    Used by Kit for programmatic user provisioning.
    Accepts admin API key or JWT from admin user.
    """
    # Check if email already exists
    existing = await db.users.find_one({"email": data.email}, {"_id": 0, "id": 1})
    if existing:
        raise APIError(
            code=ErrorCodes.EMAIL_ALREADY_EXISTS,
            message=f"A user with email '{data.email}' already exists.",
            status_code=409,
            details={"email": data.email, "existing_user_id": existing["id"]}
        )
    
    now = datetime.now(timezone.utc).isoformat()
    user_id = str(uuid.uuid4())
    
    # Hash password
    password_hash = hash_password(data.password)
    
    # Create user document
    user_doc = {
        "id": user_id,
        "email": data.email,
        "password_hash": password_hash,
        "is_admin": data.is_admin,
        "created_at": now,
        "notification_preferences": {
            "email_outcome_alerts": True,
            "email_weekly_summary": True,
            "email_score_changes": True
        }
    }
    
    await db.users.insert_one(user_doc)
    
    # Generate API key
    api_key = f"arl_{secrets.token_hex(24)}"
    api_key_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "key": api_key,
        "created_at": now,
        "revoked_at": None,
        "last_used_at": None
    }
    
    await db.api_keys.insert_one(api_key_doc)
    
    return AdminCreateUserResponse(
        id=user_id,
        email=data.email,
        is_admin=data.is_admin,
        created_at=now,
        api_key=api_key
    )


@router.post("/full-setup", response_model=AdminFullSetupResponse, status_code=201)
async def admin_full_setup(
    data: AdminFullSetupRequest,
    admin: dict = Depends(get_admin_user)
):
    """
    Create a complete client setup: user + API key + agents + webhooks.
    
    Used by admins to provision a new client account in one step.
    Returns credentials that should be shared with the client.
    """
    # Check if email already exists
    existing = await db.users.find_one({"email": data.email}, {"_id": 0, "id": 1})
    if existing:
        raise APIError(
            code=ErrorCodes.EMAIL_ALREADY_EXISTS,
            message=f"A user with email '{data.email}' already exists.",
            status_code=409,
            details={"email": data.email, "existing_user_id": existing["id"]}
        )
    
    now = datetime.now(timezone.utc).isoformat()
    user_id = str(uuid.uuid4())
    
    # Hash password
    password_hash = hash_password(data.password)
    
    # Create user document
    user_doc = {
        "id": user_id,
        "email": data.email,
        "password_hash": password_hash,
        "is_admin": False,
        "created_at": now,
        "notification_preferences": {
            "email_outcome_alerts": True,
            "email_weekly_summary": True,
            "email_score_changes": True
        }
    }
    
    await db.users.insert_one(user_doc)
    
    # Generate API key
    api_key = f"arl_{secrets.token_hex(24)}"
    api_key_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "key": api_key,
        "created_at": now,
        "revoked_at": None,
        "last_used_at": None
    }
    
    await db.api_keys.insert_one(api_key_doc)
    
    # Create agents
    created_agents = []
    for agent_input in data.agents:
        agent_id = str(uuid.uuid4())
        agent_doc = {
            "agent_id": agent_id,
            "user_id": user_id,
            "name": agent_input.name,
            "description": agent_input.description,
            "is_public": agent_input.is_public,
            "created_at": now
        }
        await db.agents.insert_one(agent_doc)
        created_agents.append(FullSetupAgentResult(
            agent_id=agent_id,
            name=agent_input.name
        ))
    
    # Create webhooks
    webhooks_created = 0
    for webhook_input in data.webhooks:
        if webhook_input.url.strip():
            webhook_doc = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "url": webhook_input.url.strip(),
                "events": webhook_input.events,
                "description": webhook_input.description,
                "created_at": now,
                "is_active": True
            }
            await db.webhooks.insert_one(webhook_doc)
            webhooks_created += 1
    
    return AdminFullSetupResponse(
        user_id=user_id,
        email=data.email,
        api_key=api_key,
        agents=created_agents,
        webhooks_created=webhooks_created
    )


@router.get("/lookup/user", response_model=AdminUserLookupResponse)
async def admin_lookup_user_by_email(
    email: str = Query(..., description="Email address to look up"),
    admin: dict = Depends(get_admin_user)
):
    """
    Look up a user by email address.
    
    Returns minimal user info including ID, useful for Kit workflows.
    """
    user = await db.users.find_one({"email": email}, {"_id": 0, "password_hash": 0})
    
    if not user:
        raise APIError(
            code=ErrorCodes.USER_NOT_FOUND,
            message=f"No user found with email '{email}'.",
            status_code=404,
            details={"email": email}
        )
    
    # Get agent count
    agent_count = await db.agents.count_documents({"user_id": user["id"]})
    
    return AdminUserLookupResponse(
        id=user["id"],
        email=user["email"],
        is_admin=user.get("is_admin", False),
        agent_count=agent_count,
        created_at=user["created_at"]
    )


@router.get("/lookup/agent", response_model=AdminAgentLookupResponse)
async def admin_lookup_agent(
    agent_id: Optional[str] = Query(None, description="Agent ID to look up"),
    name: Optional[str] = Query(None, description="Agent name to look up"),
    admin: dict = Depends(get_admin_user)
):
    """
    Look up an agent by ID or name.
    
    At least one parameter (agent_id or name) is required.
    If both provided, agent_id takes precedence.
    """
    if not agent_id and not name:
        raise APIError(
            code=ErrorCodes.VALIDATION_ERROR,
            message="At least one of 'agent_id' or 'name' is required.",
            status_code=400
        )
    
    # Build query
    query = {}
    if agent_id:
        query["agent_id"] = agent_id
    else:
        query["name"] = name
    
    agent = await db.agents.find_one(query, {"_id": 0})
    
    if not agent:
        detail = {"agent_id": agent_id} if agent_id else {"name": name}
        raise APIError(
            code=ErrorCodes.AGENT_NOT_FOUND,
            message="Agent not found.",
            status_code=404,
            details=detail
        )
    
    # Get owner info
    owner = await db.users.find_one({"id": agent["user_id"]}, {"_id": 0, "email": 1})
    owner_email = owner["email"] if owner else "unknown"
    
    # Get outcomes for score
    outcomes = await db.outcomes.find(
        {"agent_id": agent["agent_id"]}, 
        {"_id": 0}
    ).to_list(10000)
    
    score, tier, success_rate, _ = calculate_score_and_tier(outcomes)
    
    return AdminAgentLookupResponse(
        agent_id=agent["agent_id"],
        name=agent["name"],
        owner_id=agent["user_id"],
        owner_email=owner_email,
        score=score,
        tier=tier,
        outcome_count=len(outcomes),
        is_public=agent.get("is_public", False),
        created_at=agent["created_at"]
    )
