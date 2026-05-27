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
from routes.billing import router as billing_router
from routes.stripe_webhook import router as stripe_webhook_router
from routes.ssr import router as ssr_router, crawler_router as ssr_crawler_router
from routes.internal import router as internal_router
from routes.organizations import router as organizations_router
from routes.mock_aav import router as mock_aav_router

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

# Billing routes (/api/billing/*)
api_router.include_router(billing_router)

# Stripe webhook routes (/api/stripe/*)
api_router.include_router(stripe_webhook_router)

# SSR routes for SEO meta tags (/ssr/blog/*, /ssr/agent/*)
# Note: These are accessed via /api/ssr/* and provide pre-rendered HTML for crawlers
api_router.include_router(ssr_router, prefix="/ssr")

# Crawler-aware routes at root /api level
# These detect crawler user-agents and serve SSR content automatically
api_router.include_router(ssr_crawler_router)

# V1 API routes
v1_router.include_router(agents_router)  # /api/v1/agents/*
v1_router.include_router(webhooks_router)  # /api/v1/webhooks/*
v1_router.include_router(internal_router)  # /api/v1/internal/* (cross-tool events)
v1_router.include_router(organizations_router)  # /api/v1/org/*, /api/v1/organizations/*

# Mock AAV routes for testing (can be disabled in production)
api_router.include_router(mock_aav_router)  # /api/mock/aav/*

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

@app.on_event("startup")
async def startup_db_indexes():
    """Create database indexes on startup."""
    try:
        # Create index on organization_id for cross-tool queries
        await db.agents.create_index("organization_id", sparse=True)
        await db.agents.create_index("aav_certificate_id", sparse=True)
        await db.agents.create_index("safe_spend_escrow_id", sparse=True)
        await db.users.create_index("organization_id", sparse=True)
        print("Database indexes created successfully")
    except Exception as e:
        print(f"Warning: Could not create indexes: {e}")

    # Seed blog posts if none exist
    try:
        from routes.blog import slugify, generate_excerpt, count_words
        post_count = await db.blog_posts.count_documents({"status": "published"})
        if post_count == 0:
            import uuid, math
            from datetime import datetime, timezone

            seed_posts = [
                {
                    "title": "Why Agent Reputation Is the Missing Layer in AI Infrastructure",
                    "content": """Everyone building AI agents talks about capabilities. Model size. Tool use. Context windows. Reasoning chains. But almost nobody talks about what happens when agents start making decisions that affect your business, your customers, and your money.

That conversation is overdue.

## The capability trap

The current generation of AI agents can do remarkable things. They can browse the web, write code, send emails, process payments, and chain complex multi-step workflows together. The demos are impressive.

But capabilities without accountability are a liability.

When an agent makes a bad call — sends the wrong email, processes the wrong payment, acts on stale data — someone has to answer for it. Right now, nobody can. There is no system that tracks what an agent did, whether it was appropriate, or whether it should be trusted to do it again.

## What reputation actually means for agents

Reputation for AI agents is not a sentiment score. It is not a thumbs-up from a user. It is a verifiable, auditable record of outcomes.

A reputation system answers three questions:

1. **What did this agent do?** Every action, every decision, every outcome — logged and structured.
2. **Was it any good?** Not opinions. Measurable outcomes. Did the payment go through? Was the email accurate? Did the task complete within expected parameters?
3. **Should I trust it next time?** Based on historical performance, not marketing claims.

Without these answers, every agent interaction is a cold start. You are guessing every time.

## Why the market needs this now

Three trends are converging:

- **Agents are getting more autonomous.** They are not just responding to prompts anymore. They are initiating actions, chaining workflows, and operating with minimal human oversight.
- **Agents are interacting with other agents.** Multi-agent systems are becoming real. Your agent will need to decide whether to trust another agent's output — and it will need data to make that call.
- **Regulation is coming.** The EU AI Act is already law. Other jurisdictions are following. Organizations will need to prove they can track, audit, and explain what their AI systems did.

The infrastructure for tracking agent reputation does not exist yet. That is the gap RepLedger fills.

## The RepLedger approach

RepLedger is building the reputation layer for AI agents. Not a review site. Not a leaderboard. A structured, verifiable, queryable record of agent performance and trustworthiness.

Every agent gets a reputation profile. Every action creates an outcome record. Every interaction contributes to a trust score that is transparent, auditable, and machine-readable.

This is infrastructure, not a feature. The agents that will win are the ones that can prove they should be trusted.

---

If you are building AI agents and care about trust, accountability, and the infrastructure layer that makes both possible — [start building with RepLedger](https://reputationledger.dev/docs).""",
                    "author": "Kenneth Kohler",
                    "tags": ["reputation", "AI agents", "trust", "infrastructure"],
                    "meta_title": "Why Agent Reputation Is the Missing Layer in AI Infrastructure",
                    "meta_description": "Capabilities without accountability are a liability. Here is why every AI agent needs a verifiable reputation layer — and why the market needs it now."
                },
                {
                    "title": "How to Measure Agent Trustworthiness: A Practical Framework",
                    "content": """You built an agent. It works. Most of the time. But "most of the time" is not a standard. It is a hope.

To know whether an agent is trustworthy, you need a framework that turns subjective impressions into structured, comparable signals. Here is a practical approach.

## Start with outcomes, not opinions

The foundation of agent reputation is the outcome record. Every time an agent completes a task, you record:

- **What it was asked to do** — the task type (payment processing, data retrieval, code generation, etc.)
- **What actually happened** — success, failure, partial completion, or timeout
- **Who is reporting** — the agent itself (self-reported) or a human operator (operator-reported)

This is the atomic unit of reputation. Everything else builds on top of it.

## The three pillars of agent trustworthiness

### 1. Consistency

An agent that succeeds sometimes and fails unpredictably is less trustworthy than one that fails consistently. Consistency means the variance between outcomes is low. You can rely on it.

Measure it: Track the standard deviation of outcomes over time. Narrow variance = high consistency.

### 2. Volume

One successful outcome means nothing. A hundred outcomes, 94% successful — that tells you something. Volume gives statistical significance to the consistency measurement.

Measure it: Total outcome count over a rolling time window. Require a minimum threshold before calculating trust scores.

### 3. Recency

An agent that was reliable six months ago but has been degrading is not trustworthy now. Recent performance matters more than historical performance.

Measure it: Apply a time-weighted decay to older outcomes. Recent outcomes carry more weight.

## The RepLedger scoring model

RepLedger combines these three pillars into a single score:

- **Weighted success rate** — success outcomes contribute positively, failures negatively, with time decay
- **Tier classification** — agents are classified into tiers (Elite, Trusted, Developing, New) based on score thresholds
- **Transparent breakdown** — every score comes with a breakdown showing exactly how it was calculated

The score is not a black box. Anyone can see the inputs, the calculation, and the result.

## Why self-reporting is not enough

Agents can report their own outcomes. But self-reported data is inherently suspect. An agent that reports 100% success might be accurate — or it might be omitting failures.

RepLedger supports both self-reported and operator-reported outcomes. Operator-reported outcomes carry higher weight in the scoring model because they come from independent verification.

## Building the trust infrastructure

Measuring trustworthiness is only useful if the measurement is:

1. **Verifiable** — anyone can check the underlying data
2. **Comparable** — scores are calculated the same way for every agent
3. **Machine-readable** — other agents and systems can programmatically query trust scores

This is what RepLedger provides. Not a rating, but an infrastructure for trust.

---

Ready to start tracking your agents' reputation? [Read the docs](https://reputationledger.dev/docs) or [check out the API playground](https://reputationledger.dev/playground).""",
                    "author": "Kenneth Kohler",
                    "tags": ["trustworthiness", "scoring", "framework", "outcomes"],
                    "meta_title": "How to Measure Agent Trustworthiness: A Practical Framework",
                    "meta_description": "A practical framework for measuring AI agent trustworthiness using consistency, volume, and recency — and how RepLedger turns these into structured trust scores."
                },
            ]

            now = datetime.now(timezone.utc).isoformat()
            for i, post in enumerate(seed_posts):
                slug = slugify(post["title"])
                # Ensure unique slug
                existing = await db.blog_posts.find_one({"slug": slug})
                if existing:
                    continue

                word_count = count_words(post["content"])
                reading_time = max(1, math.ceil(word_count / 230))
                excerpt = generate_excerpt(post["content"])

                doc = {
                    "id": f"post_{uuid.uuid4().hex[:16]}",
                    "slug": slug,
                    "title": post["title"],
                    "content": post["content"],
                    "excerpt": excerpt,
                    "author": post["author"],
                    "status": "published",
                    "tags": post["tags"],
                    "cover_image_url": None,
                    "social_image_url": None,
                    "meta_title": post.get("meta_title", post["title"]),
                    "meta_description": post.get("meta_description", excerpt),
                    "canonical_url": f"https://reputationledger.dev/blog/{slug}",
                    "word_count": word_count,
                    "reading_time": reading_time,
                    "created_at": now,
                    "updated_at": now,
                    "published_at": now,
                }
                await db.blog_posts.insert_one(doc)
                print(f"Seeded blog post: {slug}")

            print("Blog seed complete")
    except Exception as e:
        print(f"Warning: Could not seed blog posts: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
