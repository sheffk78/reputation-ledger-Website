import uuid
import secrets
import random
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Response

from core.database import db
from core.dependencies import get_user_from_api_key
from core.exceptions import APIError, ErrorCodes
from core.plans import get_plan_limits
from models.agents import AgentCreate, AgentCreateResponse, AgentListResponse, DemoAgentResponse, AgentPublicToggle, AgentPublicProfile
from models.outcomes import OutcomeCreate, OutcomeResponse, PaginatedOutcomesResponse, ScoreResponse, OutcomeBreakdown
from models.flags import FlagCreate, FlagResponse, FlagListResponse
from services.score_service import calculate_score_and_tier, generate_badge_svg, generate_social_card_svg
from services.webhook_service import trigger_webhooks
from services.email_service import send_outcome_notification_email
from services.audit_service import (
    log_agent_created, log_outcome_created, 
    log_agent_flagged, log_agent_public_toggled
)
from typing import List, Optional

router = APIRouter(prefix="/agents", tags=["agents"])


@router.post("", response_model=AgentCreateResponse, status_code=201)
async def create_agent(
    data: AgentCreate, 
    user: dict = Depends(get_user_from_api_key),
    background_tasks: BackgroundTasks = None
):
    """Register a new agent"""
    # Check plan limits
    plan = user.get("plan", "free")
    limits = get_plan_limits(plan)
    
    if limits["max_agents"] is not None:
        current_agent_count = await db.agents.count_documents({"user_id": user["id"]})
        if current_agent_count >= limits["max_agents"]:
            raise APIError(
                code=ErrorCodes.PLAN_LIMIT_REACHED,
                message=f"Agent limit reached. Your {limits['label']} plan allows {limits['max_agents']} agent(s). Upgrade to add more.",
                status_code=403,
                details={
                    "limit_type": "max_agents",
                    "current": current_agent_count,
                    "limit": limits["max_agents"],
                    "plan": plan
                }
            )
    
    agent_id = f"agt_{secrets.token_hex(12)}"
    now = datetime.now(timezone.utc).isoformat()
    
    # Use user's organization_id if not explicitly provided
    org_id = data.organization_id or user.get("organization_id")
    
    agent_doc = {
        "agent_id": agent_id,
        "user_id": user["id"],
        "name": data.name,
        "description": data.description,
        "owner_handle": data.owner_handle,
        "organization_id": org_id,
        "aav_certificate_id": data.aav_certificate_id,
        "safe_spend_escrow_id": data.safe_spend_escrow_id,
        "created_at": now,
        "is_public": False  # Default to private
    }
    
    await db.agents.insert_one(agent_doc)
    
    # Audit logging
    if background_tasks:
        background_tasks.add_task(
            log_agent_created, user["id"], user["email"], agent_id, data.name
        )
    
    return AgentCreateResponse(
        agent_id=agent_id,
        name=data.name,
        description=data.description,
        owner_handle=data.owner_handle,
        organization_id=org_id,
        aav_certificate_id=data.aav_certificate_id,
        safe_spend_escrow_id=data.safe_spend_escrow_id,
        created_at=now
    )


@router.get("", response_model=List[AgentListResponse])
async def list_agents(
    user: dict = Depends(get_user_from_api_key),
    organization_id: Optional[str] = None
):
    """List all agents for the authenticated user with computed scores.
    Optionally filter by organization_id."""
    query = {"user_id": user["id"]}
    if organization_id:
        query["organization_id"] = organization_id
    
    agents = await db.agents.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    result = []
    for a in agents:
        # Get outcomes for this agent
        outcomes = await db.outcomes.find(
            {"agent_id": a["agent_id"]}, 
            {"_id": 0}
        ).to_list(10000)
        
        score, tier, success_rate, _ = calculate_score_and_tier(outcomes)
        
        result.append(AgentListResponse(
            agent_id=a["agent_id"],
            name=a["name"],
            description=a.get("description"),
            owner_handle=a.get("owner_handle"),
            organization_id=a.get("organization_id"),
            aav_certificate_id=a.get("aav_certificate_id"),
            safe_spend_escrow_id=a.get("safe_spend_escrow_id"),
            created_at=a["created_at"],
            score=score,
            tier=tier,
            outcome_count=len(outcomes),
            success_rate=success_rate,
            is_public=a.get("is_public", False)
        ))
    
    return result


@router.post("/demo", response_model=DemoAgentResponse, status_code=201)
async def create_demo_agent(user: dict = Depends(get_user_from_api_key)):
    """Create a demo agent with sample outcomes for onboarding (idempotent - one per user)"""
    # Check if user already has a demo agent
    existing_demo = await db.agents.find_one(
        {"user_id": user["id"], "is_demo": True},
        {"_id": 0}
    )
    
    if existing_demo:
        # Return existing demo agent
        outcomes = await db.outcomes.find(
            {"agent_id": existing_demo["agent_id"]}, 
            {"_id": 0}
        ).to_list(10000)
        
        score, tier, success_rate, _ = calculate_score_and_tier(outcomes)
        
        return DemoAgentResponse(
            agent=AgentListResponse(
                agent_id=existing_demo["agent_id"],
                name=existing_demo["name"],
                description=existing_demo.get("description"),
                owner_handle=existing_demo.get("owner_handle"),
                created_at=existing_demo["created_at"],
                score=score,
                tier=tier,
                outcome_count=len(outcomes),
                success_rate=success_rate,
                is_public=existing_demo.get("is_public", False)
            ),
            message="Demo agent already exists for your account.",
            is_new=False
        )
    
    # Create new demo agent
    agent_id = f"agt_{secrets.token_hex(12)}"
    now = datetime.now(timezone.utc).isoformat()
    
    agent_doc = {
        "agent_id": agent_id,
        "user_id": user["id"],
        "name": "Sample Support Bot",
        "description": "Demo agent with sample outcomes - shows how RepLedger tracks agent performance",
        "owner_handle": "@demo",
        "created_at": now,
        "is_demo": True,
        "is_public": False
    }
    
    await db.agents.insert_one(agent_doc)
    
    # Create sample outcomes with realistic distribution
    sample_outcomes = [
        {"result": "success", "task_type": "ticket-resolution", "submitter_type": "self"},
        {"result": "success", "task_type": "ticket-resolution", "submitter_type": "self"},
        {"result": "success", "task_type": "faq-response", "submitter_type": "self"},
        {"result": "success", "task_type": "faq-response", "submitter_type": "self"},
        {"result": "success", "task_type": "escalation-check", "submitter_type": "operator"},
        {"result": "failure", "task_type": "ticket-resolution", "submitter_type": "self"},
        {"result": "success", "task_type": "sentiment-analysis", "submitter_type": "self"},
        {"result": "success", "task_type": "ticket-resolution", "submitter_type": "self"},
        {"result": "partial", "task_type": "complex-query", "submitter_type": "operator"},
        {"result": "success", "task_type": "faq-response", "submitter_type": "self"},
        {"result": "success", "task_type": "ticket-resolution", "submitter_type": "self"},
        {"result": "failure", "task_type": "escalation-check", "submitter_type": "operator"},
        {"result": "success", "task_type": "sentiment-analysis", "submitter_type": "self"},
        {"result": "success", "task_type": "ticket-resolution", "submitter_type": "self"},
        {"result": "timeout", "task_type": "complex-query", "submitter_type": "self"},
    ]
    
    # Insert outcomes with staggered timestamps
    base_time = datetime.now(timezone.utc)
    for i, outcome_data in enumerate(sample_outcomes):
        outcome_time = base_time - timedelta(hours=i * 12 + random.randint(0, 6))
        outcome_doc = {
            "id": str(uuid.uuid4()),
            "agent_id": agent_id,
            "result": outcome_data["result"],
            "task_type": outcome_data["task_type"],
            "submitter_type": outcome_data["submitter_type"],
            "created_at": outcome_time.isoformat()
        }
        await db.outcomes.insert_one(outcome_doc)
    
    # Calculate score for response
    outcomes = await db.outcomes.find(
        {"agent_id": agent_id}, 
        {"_id": 0}
    ).to_list(100)
    
    score, tier, success_rate, _ = calculate_score_and_tier(outcomes)
    
    return DemoAgentResponse(
        agent=AgentListResponse(
            agent_id=agent_id,
            name=agent_doc["name"],
            description=agent_doc["description"],
            owner_handle=agent_doc["owner_handle"],
            created_at=now,
            score=score,
            tier=tier,
            outcome_count=len(outcomes),
            success_rate=success_rate,
            is_public=False
        ),
        message="Demo agent created with 15 sample outcomes!",
        is_new=True
    )


@router.get("/{agent_id}", response_model=AgentListResponse)
async def get_agent(agent_id: str, user: dict = Depends(get_user_from_api_key)):
    """Get a single agent with computed score"""
    agent = await db.agents.find_one(
        {"agent_id": agent_id, "user_id": user["id"]}, 
        {"_id": 0}
    )
    if not agent:
        exists = await db.agents.find_one({"agent_id": agent_id}, {"_id": 0})
        if exists:
            raise APIError(
                code=ErrorCodes.AGENT_NOT_FOUND,
                message="This agent does not belong to your account.",
                status_code=404,
                details={"agent_id": agent_id}
            )
        raise APIError(
            code=ErrorCodes.AGENT_NOT_FOUND,
            message=f"Agent '{agent_id}' not found.",
            status_code=404,
            details={"agent_id": agent_id}
        )
    
    outcomes = await db.outcomes.find(
        {"agent_id": agent_id}, 
        {"_id": 0}
    ).to_list(10000)
    
    score, tier, success_rate, _ = calculate_score_and_tier(outcomes)
    
    return AgentListResponse(
        agent_id=agent["agent_id"],
        name=agent["name"],
        description=agent.get("description"),
        owner_handle=agent.get("owner_handle"),
        organization_id=agent.get("organization_id"),
        aav_certificate_id=agent.get("aav_certificate_id"),
        safe_spend_escrow_id=agent.get("safe_spend_escrow_id"),
        created_at=agent["created_at"],
        score=score,
        tier=tier,
        outcome_count=len(outcomes),
        success_rate=success_rate,
        is_public=agent.get("is_public", False)
    )


@router.delete("/{agent_id}", status_code=204)
async def delete_agent(
    agent_id: str,
    user: dict = Depends(get_user_from_api_key)
):
    """Delete an agent and all its associated data (outcomes, flags)"""
    # Verify agent exists and belongs to user
    agent = await db.agents.find_one(
        {"agent_id": agent_id, "user_id": user["id"]},
        {"_id": 0}
    )
    
    if not agent:
        exists = await db.agents.find_one({"agent_id": agent_id}, {"_id": 0})
        if exists:
            raise APIError(
                code=ErrorCodes.AGENT_NOT_FOUND,
                message="This agent does not belong to your account.",
                status_code=404,
                details={"agent_id": agent_id}
            )
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


@router.patch("/{agent_id}/public", response_model=AgentListResponse)
async def toggle_agent_public(
    agent_id: str, 
    data: AgentPublicToggle, 
    user: dict = Depends(get_user_from_api_key),
    background_tasks: BackgroundTasks = None
):
    """Toggle agent's public visibility"""
    agent = await db.agents.find_one(
        {"agent_id": agent_id, "user_id": user["id"]}, 
        {"_id": 0}
    )
    if not agent:
        raise APIError(
            code=ErrorCodes.AGENT_NOT_FOUND,
            message=f"Agent '{agent_id}' not found.",
            status_code=404,
            details={"agent_id": agent_id}
        )
    
    # Update is_public
    await db.agents.update_one(
        {"agent_id": agent_id},
        {"$set": {"is_public": data.is_public}}
    )
    
    # Audit logging
    if background_tasks:
        background_tasks.add_task(
            log_agent_public_toggled,
            user["id"],
            user["email"],
            agent_id,
            agent["name"],
            data.is_public
        )
    
    # Get updated agent with score
    outcomes = await db.outcomes.find(
        {"agent_id": agent_id}, 
        {"_id": 0}
    ).to_list(10000)
    
    score, tier, success_rate, _ = calculate_score_and_tier(outcomes)
    
    return AgentListResponse(
        agent_id=agent["agent_id"],
        name=agent["name"],
        description=agent.get("description"),
        owner_handle=agent.get("owner_handle"),
        organization_id=agent.get("organization_id"),
        aav_certificate_id=agent.get("aav_certificate_id"),
        safe_spend_escrow_id=agent.get("safe_spend_escrow_id"),
        created_at=agent["created_at"],
        score=score,
        tier=tier,
        outcome_count=len(outcomes),
        success_rate=success_rate,
        is_public=data.is_public
    )


@router.post("/{agent_id}/outcomes", response_model=OutcomeResponse, status_code=201)
async def create_outcome(
    agent_id: str, 
    data: OutcomeCreate, 
    background_tasks: BackgroundTasks, 
    user: dict = Depends(get_user_from_api_key)
):
    """Submit an outcome for an agent"""
    agent = await db.agents.find_one(
        {"agent_id": agent_id, "user_id": user["id"]}, 
        {"_id": 0}
    )
    if not agent:
        exists = await db.agents.find_one({"agent_id": agent_id}, {"_id": 0})
        if exists:
            raise APIError(
                code=ErrorCodes.AGENT_NOT_FOUND,
                message="This agent does not belong to your account.",
                status_code=404,
                details={"agent_id": agent_id}
            )
        raise APIError(
            code=ErrorCodes.AGENT_NOT_FOUND,
            message=f"Agent '{agent_id}' not found.",
            status_code=404,
            details={"agent_id": agent_id}
        )
    
    # Check plan limits for outcomes this month
    plan = user.get("plan", "free")
    limits = get_plan_limits(plan)
    
    if limits["max_outcomes_per_month"] is not None:
        # Count outcomes this month for all user's agents
        now = datetime.now(timezone.utc)
        first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
        
        agent_ids_cursor = await db.agents.find(
            {"user_id": user["id"]},
            {"agent_id": 1, "_id": 0}
        ).to_list(10000)
        agent_ids = [a["agent_id"] for a in agent_ids_cursor]
        
        outcomes_this_month = await db.outcomes.count_documents({
            "agent_id": {"$in": agent_ids},
            "created_at": {"$gte": first_of_month}
        })
        
        if outcomes_this_month >= limits["max_outcomes_per_month"]:
            raise APIError(
                code=ErrorCodes.PLAN_LIMIT_REACHED,
                message=f"Monthly outcome limit reached. Your {limits['label']} plan allows {limits['max_outcomes_per_month']:,} outcomes/month. Upgrade for more.",
                status_code=403,
                details={
                    "limit_type": "max_outcomes_per_month",
                    "current": outcomes_this_month,
                    "limit": limits["max_outcomes_per_month"],
                    "plan": plan
                }
            )
    
    outcome_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    outcome_doc = {
        "id": outcome_id,
        "agent_id": agent_id,
        "result": data.result,
        "task_type": data.task_type,
        "submitter_type": data.submitter_type,
        "source": data.source or "manual",
        "source_event_id": data.source_event_id,
        "metadata": data.metadata,
        "created_at": now
    }
    
    await db.outcomes.insert_one(outcome_doc)
    
    # Calculate new score for notifications and webhooks
    outcomes = await db.outcomes.find(
        {"agent_id": agent_id}, 
        {"_id": 0}
    ).to_list(10000)
    new_score, new_tier, _, _ = calculate_score_and_tier(outcomes)
    
    # Send outcome notification email if user has notifications enabled
    if user.get("email_notifications", True):
        background_tasks.add_task(
            send_outcome_notification_email,
            user["email"],
            agent["name"],
            agent_id,
            data.result,
            data.task_type,
            new_score,
            new_tier
        )
    
    # Trigger webhooks for this user
    background_tasks.add_task(
        trigger_webhooks,
        user["id"],
        "outcome.created",
        {
            "outcome_id": outcome_id,
            "agent_id": agent_id,
            "agent_name": agent["name"],
            "result": data.result,
            "task_type": data.task_type,
            "submitter_type": data.submitter_type,
            "source": data.source or "manual",
            "score": new_score,
            "tier": new_tier,
            "created_at": now
        }
    )
    
    # Audit logging
    background_tasks.add_task(
        log_outcome_created,
        user["id"],
        user["email"],
        agent_id,
        outcome_id,
        data.result,
        data.submitter_type
    )
    
    return OutcomeResponse(
        id=outcome_id,
        agent_id=agent_id,
        result=data.result,
        task_type=data.task_type,
        submitter_type=data.submitter_type,
        source=data.source or "manual",
        source_event_id=data.source_event_id,
        metadata=data.metadata,
        created_at=now
    )


@router.get("/{agent_id}/outcomes", response_model=PaginatedOutcomesResponse)
async def list_outcomes(
    agent_id: str, 
    page: int = 1,
    limit: int = 20,
    result: Optional[str] = None,
    source: Optional[str] = None,
    user: dict = Depends(get_user_from_api_key)
):
    """List outcomes for an agent with pagination and optional filters"""
    if page < 1:
        page = 1
    if limit < 1:
        limit = 1
    if limit > 100:
        limit = 100
    
    agent = await db.agents.find_one(
        {"agent_id": agent_id, "user_id": user["id"]}, 
        {"_id": 0}
    )
    if not agent:
        exists = await db.agents.find_one({"agent_id": agent_id}, {"_id": 0})
        if exists:
            raise APIError(
                code=ErrorCodes.AGENT_NOT_FOUND,
                message="This agent does not belong to your account.",
                status_code=404,
                details={"agent_id": agent_id}
            )
        raise APIError(
            code=ErrorCodes.AGENT_NOT_FOUND,
            message=f"Agent '{agent_id}' not found.",
            status_code=404,
            details={"agent_id": agent_id}
        )
    
    # Build query with optional filters
    query = {"agent_id": agent_id}
    if result and result in ["success", "failure", "partial", "timeout"]:
        query["result"] = result
    if source and source in ["manual", "aav", "safe_spend"]:
        query["source"] = source
    
    total = await db.outcomes.count_documents(query)
    skip = (page - 1) * limit
    
    outcomes = await db.outcomes.find(
        query, 
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return PaginatedOutcomesResponse(
        data=[OutcomeResponse(
            id=o["id"],
            agent_id=o["agent_id"],
            result=o["result"],
            task_type=o["task_type"],
            submitter_type=o["submitter_type"],
            source=o.get("source", "manual"),
            source_event_id=o.get("source_event_id"),
            metadata=o.get("metadata"),
            created_at=o["created_at"]
        ) for o in outcomes],
        page=page,
        limit=limit,
        total=total
    )


@router.get("/{agent_id}/score", response_model=ScoreResponse)
async def get_agent_score(agent_id: str, user: dict = Depends(get_user_from_api_key)):
    """Get computed score and tier for an agent"""
    agent = await db.agents.find_one(
        {"agent_id": agent_id, "user_id": user["id"]}, 
        {"_id": 0}
    )
    if not agent:
        exists = await db.agents.find_one({"agent_id": agent_id}, {"_id": 0})
        if exists:
            raise APIError(
                code=ErrorCodes.AGENT_NOT_FOUND,
                message="This agent does not belong to your account.",
                status_code=404,
                details={"agent_id": agent_id}
            )
        raise APIError(
            code=ErrorCodes.AGENT_NOT_FOUND,
            message=f"Agent '{agent_id}' not found.",
            status_code=404,
            details={"agent_id": agent_id}
        )
    
    outcomes = await db.outcomes.find(
        {"agent_id": agent_id}, 
        {"_id": 0}
    ).to_list(10000)
    
    score, tier, success_rate, breakdown = calculate_score_and_tier(outcomes)
    
    return ScoreResponse(
        agent_id=agent_id,
        score=score,
        tier=tier,
        outcome_count=len(outcomes),
        success_rate=success_rate,
        breakdown=OutcomeBreakdown(**breakdown)
    )


@router.get("/{agent_id}/badge.svg")
async def get_agent_badge(agent_id: str):
    """
    Get embeddable SVG badge for an agent.
    This is a PUBLIC endpoint - no authentication required for embedding.
    """
    agent = await db.agents.find_one({"agent_id": agent_id}, {"_id": 0})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    outcomes = await db.outcomes.find(
        {"agent_id": agent_id}, 
        {"_id": 0}
    ).to_list(10000)
    
    score, tier, _, _ = calculate_score_and_tier(outcomes)
    svg = generate_badge_svg(tier, score)
    
    return Response(
        content=svg,
        media_type="image/svg+xml",
        headers={
            "Cache-Control": "public, max-age=300",
            "Content-Type": "image/svg+xml; charset=utf-8"
        }
    )


@router.get("/{agent_id}/social-card.svg")
async def get_agent_social_card(agent_id: str):
    """
    Get 1200x630 SVG social card for sharing agent profiles.
    This is a PUBLIC endpoint optimized for Open Graph and Twitter cards.
    """
    agent = await db.agents.find_one({"agent_id": agent_id}, {"_id": 0})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    outcomes = await db.outcomes.find(
        {"agent_id": agent_id}, 
        {"_id": 0}
    ).to_list(10000)
    
    score, tier, success_rate, _ = calculate_score_and_tier(outcomes)
    
    svg = generate_social_card_svg(
        agent_name=agent.get("name", "Unknown Agent"),
        tier=tier,
        score=score,
        success_rate=success_rate,
        outcome_count=len(outcomes),
        description=agent.get("description"),
        owner_handle=agent.get("owner_handle")
    )
    
    return Response(
        content=svg,
        media_type="image/svg+xml",
        headers={
            "Cache-Control": "public, max-age=300",
            "Content-Type": "image/svg+xml; charset=utf-8"
        }
    )


# Flag routes for agents
@router.post("/{agent_id}/flags", response_model=FlagResponse, status_code=201)
async def create_flag(
    agent_id: str, 
    data: FlagCreate, 
    user: dict = Depends(get_user_from_api_key),
    background_tasks: BackgroundTasks = None
):
    """Create a flag for an agent or specific outcome"""
    agent = await db.agents.find_one(
        {"agent_id": agent_id, "user_id": user["id"]}, 
        {"_id": 0}
    )
    if not agent:
        exists = await db.agents.find_one({"agent_id": agent_id}, {"_id": 0})
        if exists:
            raise APIError(
                code=ErrorCodes.AGENT_NOT_FOUND,
                message="This agent does not belong to your account.",
                status_code=404,
                details={"agent_id": agent_id}
            )
        raise APIError(
            code=ErrorCodes.AGENT_NOT_FOUND,
            message=f"Agent '{agent_id}' not found.",
            status_code=404,
            details={"agent_id": agent_id}
        )
    
    if data.outcome_id:
        outcome = await db.outcomes.find_one(
            {"id": data.outcome_id, "agent_id": agent_id},
            {"_id": 0}
        )
        if not outcome:
            raise APIError(
                code=ErrorCodes.OUTCOME_NOT_FOUND,
                message="Outcome not found or does not belong to this agent.",
                status_code=404,
                details={"outcome_id": data.outcome_id, "agent_id": agent_id}
            )
    
    flag_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    flag_doc = {
        "id": flag_id,
        "agent_id": agent_id,
        "outcome_id": data.outcome_id,
        "reason": data.reason,
        "notes": data.notes,
        "created_by_user_id": user["id"],
        "created_at": now
    }
    
    await db.flags.insert_one(flag_doc)
    
    # Audit logging
    if background_tasks:
        background_tasks.add_task(
            log_agent_flagged,
            user["id"],
            user["email"],
            agent_id,
            flag_id,
            data.reason,
            data.outcome_id
        )
    
    return FlagResponse(
        id=flag_id,
        agent_id=agent_id,
        outcome_id=data.outcome_id,
        reason=data.reason,
        notes=data.notes,
        created_by_user_id=user["id"],
        created_at=now
    )


@router.get("/{agent_id}/flags", response_model=FlagListResponse)
async def list_flags(agent_id: str, user: dict = Depends(get_user_from_api_key)):
    """List all flags for an agent"""
    agent = await db.agents.find_one(
        {"agent_id": agent_id, "user_id": user["id"]}, 
        {"_id": 0}
    )
    if not agent:
        exists = await db.agents.find_one({"agent_id": agent_id}, {"_id": 0})
        if exists:
            raise APIError(
                code=ErrorCodes.AGENT_NOT_FOUND,
                message="This agent does not belong to your account.",
                status_code=404,
                details={"agent_id": agent_id}
            )
        raise APIError(
            code=ErrorCodes.AGENT_NOT_FOUND,
            message=f"Agent '{agent_id}' not found.",
            status_code=404,
            details={"agent_id": agent_id}
        )
    
    flags = await db.flags.find(
        {"agent_id": agent_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    return FlagListResponse(
        flags=[FlagResponse(**f) for f in flags],
        total=len(flags)
    )
