"""
RepLedger API - Main Application Entry Point

This is the main FastAPI application that brings together all routes,
middleware, and exception handlers.
"""
import os
import logging
from fastapi import FastAPI, APIRouter, Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.middleware.cors import CORSMiddleware

# Core imports
from core.config import settings
from core.database import client
from core.exceptions import APIError, ErrorCodes, create_error_response

# Route imports
from routes.auth import router as auth_router, api_key_router
from routes.agents import router as agents_router
from routes.webhooks import router as webhooks_router
from routes.admin import router as admin_router
from routes.settings import router as settings_router
from routes.feedback import router as feedback_router
from routes.blog import admin_router as blog_admin_router, public_router as blog_public_router
from routes.sandbox import router as sandbox_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create the main app
app = FastAPI(title="RepLedger API", version="1.0.0")

# Create routers
api_router = APIRouter(prefix="/api")
v1_router = APIRouter(prefix="/api/v1")


# ============== EXCEPTION HANDLERS ==============

@app.exception_handler(APIError)
async def api_error_handler(request: Request, exc: APIError):
    """Handle custom API errors with standardized format"""
    return JSONResponse(
        status_code=exc.status_code,
        content=create_error_response(exc.code, exc.message, exc.details)
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors with user-friendly messages"""
    errors = exc.errors()
    field_errors = {}
    
    for error in errors:
        loc = error.get("loc", [])
        field = loc[-1] if loc else "unknown"
        error_type = error.get("type", "")
        
        # Create user-friendly messages
        if error_type == "value_error.email":
            field_errors[field] = "Please enter a valid email address."
        elif error_type == "string_too_short":
            ctx = error.get("ctx", {})
            min_length = ctx.get("min_length", 1)
            if field == "password" or field == "new_password":
                field_errors[field] = f"Password must be at least {min_length} characters."
            elif field == "name":
                field_errors[field] = "Name is required."
            else:
                field_errors[field] = f"This field must be at least {min_length} characters."
        elif error_type == "string_too_long":
            ctx = error.get("ctx", {})
            max_length = ctx.get("max_length", 100)
            field_errors[field] = f"This field cannot exceed {max_length} characters."
        elif error_type == "missing":
            if field == "email":
                field_errors[field] = "Email is required."
            elif field == "password":
                field_errors[field] = "Password is required."
            elif field == "name":
                field_errors[field] = "Name is required."
            elif field == "url":
                field_errors[field] = "URL is required."
            elif field == "result":
                field_errors[field] = "Result is required."
            elif field == "task_type":
                field_errors[field] = "Task type is required."
            elif field == "submitter_type":
                field_errors[field] = "Submitter type is required."
            else:
                field_errors[field] = f"{field.replace('_', ' ').title()} is required."
        elif error_type == "string_pattern_mismatch":
            if field == "result":
                field_errors[field] = "Result must be one of: success, failure, partial, timeout."
            elif field == "submitter_type":
                field_errors[field] = "Submitter type must be either 'self' or 'operator'."
            else:
                field_errors[field] = "Invalid format for this field."
        elif "email" in error_type.lower():
            field_errors[field] = "Please enter a valid email address."
        else:
            msg = error.get("msg", "Invalid value")
            field_errors[field] = msg.capitalize() if not msg[0].isupper() else msg
    
    if len(field_errors) == 1:
        summary = list(field_errors.values())[0]
    else:
        summary = "Please correct the following errors."
    
    return JSONResponse(
        status_code=422,
        content=create_error_response(
            ErrorCodes.VALIDATION_ERROR,
            summary,
            {"fields": field_errors}
        )
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Convert HTTPException to standardized format"""
    code_map = {
        401: ErrorCodes.INVALID_CREDENTIALS,
        403: ErrorCodes.INVALID_API_KEY,
        404: ErrorCodes.RESOURCE_NOT_FOUND,
    }
    
    error_code = code_map.get(exc.status_code, "HTTP_ERROR")
    
    return JSONResponse(
        status_code=exc.status_code,
        content=create_error_response(error_code, exc.detail)
    )


# ============== BASIC ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "RepLedger API", "version": "1.0.0"}


@api_router.get("/health")
async def health():
    return {"status": "healthy"}


# ============== PUBLIC ROUTES ==============

from core.database import db
from services.score_service import calculate_score_and_tier
from models.agents import AgentPublicProfile, UsageStatsResponse
from core.dependencies import get_current_user
from datetime import datetime, timezone, timedelta


@api_router.get("/public/agents/{agent_id}", response_model=AgentPublicProfile)
async def get_public_agent_profile(agent_id: str):
    """
    Get public agent profile (no authentication required).
    Returns limited data if agent has is_public=true.
    """
    agent = await db.agents.find_one({"agent_id": agent_id}, {"_id": 0})
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    if not agent.get("is_public", False):
        raise HTTPException(status_code=404, detail="This agent profile is not publicly available")
    
    # Get outcomes for score calculation
    outcomes = await db.outcomes.find(
        {"agent_id": agent_id}, 
        {"_id": 0}
    ).to_list(10000)
    
    score, tier, success_rate, breakdown = calculate_score_and_tier(outcomes)
    
    return AgentPublicProfile(
        agent_id=agent["agent_id"],
        name=agent["name"],
        description=agent.get("description"),
        owner_handle=agent.get("owner_handle"),
        score=score,
        tier=tier,
        outcome_count=len(outcomes),
        success_rate=success_rate,
        breakdown=breakdown
    )


@api_router.get("/usage-stats", response_model=UsageStatsResponse)
async def get_usage_stats(user: dict = Depends(get_current_user)):
    """
    Get usage statistics for the current user's dashboard overview.
    Returns total agents, total outcomes, outcomes in last 7 days, and average score.
    """
    user_id = user["id"]
    
    # Total agents
    total_agents = await db.agents.count_documents({"user_id": user_id})
    
    # Get all agent IDs for this user
    agents = await db.agents.find(
        {"user_id": user_id}, 
        {"agent_id": 1, "_id": 0}
    ).to_list(10000)
    agent_ids = [a["agent_id"] for a in agents]
    
    # Total outcomes
    total_outcomes = await db.outcomes.count_documents({"agent_id": {"$in": agent_ids}})
    
    # Outcomes in last 7 days
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    outcomes_last_7_days = await db.outcomes.count_documents({
        "agent_id": {"$in": agent_ids},
        "created_at": {"$gte": seven_days_ago}
    })
    
    # Calculate average score across agents with >= 5 outcomes
    scores = []
    for agent_id in agent_ids:
        outcomes = await db.outcomes.find(
            {"agent_id": agent_id}, 
            {"_id": 0, "result": 1}
        ).to_list(10000)
        
        if len(outcomes) >= 5:
            score, _, _, _ = calculate_score_and_tier(outcomes)
            scores.append(score)
    
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0
    
    return UsageStatsResponse(
        total_agents=total_agents,
        total_outcomes=total_outcomes,
        outcomes_last_7_days=outcomes_last_7_days,
        avg_score=avg_score
    )


# ============== INCLUDE ROUTERS ==============

# Auth routes (/api/auth/*)
api_router.include_router(auth_router)

# API Key routes (/api/api-key, /api/api-key/regenerate)
api_router.include_router(api_key_router)

# Settings routes (/api/settings/*)
api_router.include_router(settings_router)

# Feedback routes (/api/feedback, /api/client-events)
api_router.include_router(feedback_router)

# Admin routes (/api/admin/*)
api_router.include_router(admin_router)

# Blog admin routes (/api/admin/blog/*)
api_router.include_router(blog_admin_router)

# Blog public routes (/api/blog/*)
api_router.include_router(blog_public_router)

# Sandbox routes (/api/sandbox/*)
api_router.include_router(sandbox_router)

# V1 API routes
v1_router.include_router(agents_router)  # /api/v1/agents/*
v1_router.include_router(webhooks_router)  # /api/v1/webhooks/*

# Include main routers in app
app.include_router(api_router)
app.include_router(v1_router)


# ============== MIDDLEWARE ==============

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=settings.CORS_ORIGINS.split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============== LIFECYCLE EVENTS ==============

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
