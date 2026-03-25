from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Response, BackgroundTasks, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import bcrypt
import jwt
import secrets
import httpx
import re
from services.email_service import (
    send_welcome_email, 
    send_password_reset_email, 
    send_outcome_notification_email
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT settings
JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Create the main app
app = FastAPI(title="RepLedger API", version="1.0.0")

# Create routers
api_router = APIRouter(prefix="/api")
v1_router = APIRouter(prefix="/api/v1")

security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== EXCEPTION HANDLERS ==============
# These will be registered after models are defined (see below after ErrorCodes)

# ============== MODELS ==============

# Auth models
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# API Key models
class ApiKeyResponse(BaseModel):
    api_key: str
    created_at: str

# Agent models
class AgentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    owner_handle: Optional[str] = None

class AgentCreateResponse(BaseModel):
    """Response for POST /v1/agents per spec"""
    agent_id: str
    name: str
    description: Optional[str] = None
    owner_handle: Optional[str] = None
    created_at: str

class AgentListResponse(BaseModel):
    """Response for GET /v1/agents with computed fields"""
    agent_id: str
    name: str
    description: Optional[str] = None
    owner_handle: Optional[str] = None
    created_at: str
    score: float = 0
    tier: str = "Unrated"
    outcome_count: int = 0
    success_rate: float = 0

# Outcome models
class OutcomeCreate(BaseModel):
    result: str = Field(..., pattern="^(success|failure|partial|timeout)$")
    task_type: str = Field(min_length=1, max_length=100)
    submitter_type: str = Field(..., pattern="^(self|operator)$")

class OutcomeResponse(BaseModel):
    id: str
    agent_id: str
    result: str
    task_type: str
    submitter_type: str
    created_at: str

class ScoreResponse(BaseModel):
    agent_id: str
    score: float
    tier: str
    outcome_count: int
    success_rate: float

# Webhook models
class WebhookCreate(BaseModel):
    url: str = Field(..., min_length=10, max_length=500)
    events: List[str] = Field(default=["outcome.created"])
    description: Optional[str] = None

class WebhookResponse(BaseModel):
    id: str
    url: str
    events: List[str]
    description: Optional[str] = None
    created_at: str
    is_active: bool = True

class WebhookListResponse(BaseModel):
    webhooks: List[WebhookResponse]

# Password Reset models
class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=6)

# ============== STANDARDIZED ERROR MODELS ==============

class ErrorDetail(BaseModel):
    """Standard error detail structure"""
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None

class ErrorResponse(BaseModel):
    """Standard error response wrapper"""
    error: ErrorDetail

# Error codes
class ErrorCodes:
    # Auth errors
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    TOKEN_INVALID = "TOKEN_INVALID"
    MISSING_TOKEN = "MISSING_TOKEN"
    INVALID_API_KEY = "INVALID_API_KEY"
    EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS"
    
    # Validation errors
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_EMAIL = "INVALID_EMAIL"
    PASSWORD_TOO_SHORT = "PASSWORD_TOO_SHORT"
    FIELD_REQUIRED = "FIELD_REQUIRED"
    INVALID_ENUM_VALUE = "INVALID_ENUM_VALUE"
    INVALID_URL = "INVALID_URL"
    
    # Resource errors
    AGENT_NOT_FOUND = "AGENT_NOT_FOUND"
    WEBHOOK_NOT_FOUND = "WEBHOOK_NOT_FOUND"
    USER_NOT_FOUND = "USER_NOT_FOUND"
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND"
    
    # Business logic errors
    WEBHOOK_LIMIT_REACHED = "WEBHOOK_LIMIT_REACHED"
    DUPLICATE_WEBHOOK_URL = "DUPLICATE_WEBHOOK_URL"
    RESET_TOKEN_INVALID = "RESET_TOKEN_INVALID"
    RESET_TOKEN_EXPIRED = "RESET_TOKEN_EXPIRED"

class APIError(Exception):
    """Custom API exception with standardized error format"""
    def __init__(
        self, 
        code: str, 
        message: str, 
        status_code: int = 400,
        details: Optional[Dict[str, Any]] = None
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)

def create_error_response(code: str, message: str, details: Optional[Dict[str, Any]] = None) -> dict:
    """Create a standardized error response dict"""
    response = {
        "error": {
            "code": code,
            "message": message
        }
    }
    if details:
        response["error"]["details"] = details
    return response

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
        # Get field name from location
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
            # Default message
            msg = error.get("msg", "Invalid value")
            field_errors[field] = msg.capitalize() if not msg[0].isupper() else msg
    
    # Create summary message
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
    # Map common status codes to error codes
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

# ============== UTILITY FUNCTIONS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc).timestamp() + (JWT_EXPIRATION_HOURS * 3600)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise APIError(
            code=ErrorCodes.TOKEN_EXPIRED,
            message="Your session has expired. Please sign in again.",
            status_code=401
        )
    except jwt.InvalidTokenError:
        raise APIError(
            code=ErrorCodes.TOKEN_INVALID,
            message="Invalid authentication token.",
            status_code=401
        )

def calculate_score_and_tier(outcomes: List[dict]) -> tuple:
    """Calculate score and tier from outcomes list"""
    total = len(outcomes)
    if total == 0:
        return 0.0, "Unrated", 0.0
    
    successful = sum(1 for o in outcomes if o["result"] == "success")
    success_rate = (successful / total) * 100
    score = round(success_rate, 1)
    
    # Determine tier based on spec
    if total < 5:
        tier = "Unrated"
    elif score < 50:
        tier = "Bronze"
    elif score < 75:
        tier = "Silver"
    elif score < 90:
        tier = "Gold"
    elif total >= 50:
        tier = "Platinum"
    else:
        tier = "Gold"  # Score >= 90 but < 50 outcomes
    
    return score, tier, round(success_rate, 1)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get user from JWT token (for dashboard auth)"""
    if not credentials:
        raise APIError(
            code=ErrorCodes.MISSING_TOKEN,
            message="Authentication required. Please sign in.",
            status_code=401
        )
    
    token = credentials.credentials
    payload = decode_token(token)
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise APIError(
            code=ErrorCodes.USER_NOT_FOUND,
            message="User account not found.",
            status_code=401
        )
    return user

async def get_user_from_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get user from API key (for v1 endpoints)"""
    if not credentials:
        raise APIError(
            code=ErrorCodes.MISSING_TOKEN,
            message="Authentication required. Provide an API key or JWT token in the Authorization header.",
            status_code=401
        )
    
    token = credentials.credentials
    
    # First try JWT token
    try:
        payload = decode_token(token)
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if user:
            return user
    except APIError:
        pass  # Try API key next
    
    # Then try API key
    api_key_doc = await db.api_keys.find_one({"key": token, "revoked_at": None}, {"_id": 0})
    if api_key_doc:
        user = await db.users.find_one({"id": api_key_doc["user_id"]}, {"_id": 0})
        if user:
            return user
    
    raise APIError(
        code=ErrorCodes.INVALID_API_KEY,
        message="Invalid API key or token. Check your credentials and try again.",
        status_code=401
    )

async def trigger_webhooks(user_id: str, event_type: str, payload: dict):
    """Trigger all active webhooks for a user for a specific event"""
    webhooks = await db.webhooks.find(
        {"user_id": user_id, "is_active": True},
        {"_id": 0}
    ).to_list(100)
    
    for webhook in webhooks:
        if event_type in webhook.get("events", []):
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    webhook_payload = {
                        "event": event_type,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "data": payload
                    }
                    response = await client.post(
                        webhook["url"],
                        json=webhook_payload,
                        headers={"Content-Type": "application/json", "X-RepLedger-Event": event_type}
                    )
                    
                    # Log webhook delivery
                    await db.webhook_logs.insert_one({
                        "id": str(uuid.uuid4()),
                        "webhook_id": webhook["id"],
                        "user_id": user_id,
                        "event": event_type,
                        "url": webhook["url"],
                        "status_code": response.status_code,
                        "success": 200 <= response.status_code < 300,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    })
                    logger.info(f"Webhook delivered to {webhook['url']} with status {response.status_code}")
            except Exception as e:
                # Log failed delivery
                await db.webhook_logs.insert_one({
                    "id": str(uuid.uuid4()),
                    "webhook_id": webhook["id"],
                    "user_id": user_id,
                    "event": event_type,
                    "url": webhook["url"],
                    "status_code": None,
                    "success": False,
                    "error": str(e),
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                logger.error(f"Failed to deliver webhook to {webhook['url']}: {e}")

# ============== AUTH ROUTES ==============

@api_router.post("/auth/signup", response_model=TokenResponse)
async def signup(data: UserCreate, background_tasks: BackgroundTasks):
    """Create a new user account"""
    # Check if user exists
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise APIError(
            code=ErrorCodes.EMAIL_ALREADY_EXISTS,
            message="An account with this email already exists. Please sign in or use a different email.",
            status_code=400
        )
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Create user
    user_doc = {
        "id": user_id,
        "email": data.email.lower(),
        "password_hash": hash_password(data.password),
        "created_at": now,
        "email_notifications": True  # Default to enabled
    }
    await db.users.insert_one(user_doc)
    
    # Generate API key for new user
    api_key = f"arl_{secrets.token_hex(24)}"
    api_key_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "key": api_key,
        "created_at": now,
        "revoked_at": None
    }
    await db.api_keys.insert_one(api_key_doc)
    
    # Send welcome email in background
    background_tasks.add_task(send_welcome_email, data.email.lower())
    
    token = create_token(user_id, data.email.lower())
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user_id, email=data.email.lower(), created_at=now)
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    """Login with email and password"""
    user = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise APIError(
            code=ErrorCodes.INVALID_CREDENTIALS,
            message="Invalid email or password. Please check your credentials and try again.",
            status_code=401
        )
    
    token = create_token(user["id"], user["email"])
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user["id"], email=user["email"], created_at=user["created_at"])
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    """Get current user info"""
    return UserResponse(id=user["id"], email=user["email"], created_at=user["created_at"])

# ============== API KEY ROUTES ==============

@api_router.get("/api-key", response_model=ApiKeyResponse)
async def get_api_key(user: dict = Depends(get_current_user)):
    """Get the current user's API key"""
    api_key = await db.api_keys.find_one(
        {"user_id": user["id"], "revoked_at": None},
        {"_id": 0}
    )
    if not api_key:
        raise HTTPException(status_code=404, detail="No API key found")
    
    return ApiKeyResponse(api_key=api_key["key"], created_at=api_key["created_at"])

@api_router.post("/api-key/regenerate", response_model=ApiKeyResponse)
async def regenerate_api_key(user: dict = Depends(get_current_user)):
    """Regenerate the user's API key (revokes the old one)"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Revoke existing keys
    await db.api_keys.update_many(
        {"user_id": user["id"], "revoked_at": None},
        {"$set": {"revoked_at": now}}
    )
    
    # Generate new key
    api_key = f"arl_{secrets.token_hex(24)}"
    api_key_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "key": api_key,
        "created_at": now,
        "revoked_at": None
    }
    await db.api_keys.insert_one(api_key_doc)
    
    return ApiKeyResponse(api_key=api_key, created_at=now)

# ============== V1 API ROUTES ==============

@v1_router.post("/agents", response_model=AgentCreateResponse, status_code=201)
async def create_agent(data: AgentCreate, user: dict = Depends(get_user_from_api_key)):
    """Register a new agent"""
    agent_id = f"agt_{secrets.token_hex(12)}"
    now = datetime.now(timezone.utc).isoformat()
    
    agent_doc = {
        "agent_id": agent_id,
        "user_id": user["id"],
        "name": data.name,
        "description": data.description,
        "owner_handle": data.owner_handle,
        "created_at": now
    }
    
    await db.agents.insert_one(agent_doc)
    
    return AgentCreateResponse(
        agent_id=agent_id,
        name=data.name,
        description=data.description,
        owner_handle=data.owner_handle,
        created_at=now
    )

@v1_router.get("/agents", response_model=List[AgentListResponse])
async def list_agents(user: dict = Depends(get_user_from_api_key)):
    """List all agents for the authenticated user with computed scores"""
    agents = await db.agents.find(
        {"user_id": user["id"]}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    result = []
    for a in agents:
        # Get outcomes for this agent
        outcomes = await db.outcomes.find(
            {"agent_id": a["agent_id"]}, 
            {"_id": 0}
        ).to_list(10000)
        
        score, tier, success_rate = calculate_score_and_tier(outcomes)
        
        result.append(AgentListResponse(
            agent_id=a["agent_id"],
            name=a["name"],
            description=a.get("description"),
            owner_handle=a.get("owner_handle"),
            created_at=a["created_at"],
            score=score,
            tier=tier,
            outcome_count=len(outcomes),
            success_rate=success_rate
        ))
    
    return result

@v1_router.get("/agents/{agent_id}", response_model=AgentListResponse)
async def get_agent(agent_id: str, user: dict = Depends(get_user_from_api_key)):
    """Get a single agent with computed score"""
    agent = await db.agents.find_one(
        {"agent_id": agent_id, "user_id": user["id"]}, 
        {"_id": 0}
    )
    if not agent:
        # Check if agent exists but belongs to another user
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
    
    score, tier, success_rate = calculate_score_and_tier(outcomes)
    
    return AgentListResponse(
        agent_id=agent["agent_id"],
        name=agent["name"],
        description=agent.get("description"),
        owner_handle=agent.get("owner_handle"),
        created_at=agent["created_at"],
        score=score,
        tier=tier,
        outcome_count=len(outcomes),
        success_rate=success_rate
    )

@v1_router.post("/agents/{agent_id}/outcomes", response_model=OutcomeResponse, status_code=201)
async def create_outcome(agent_id: str, data: OutcomeCreate, background_tasks: BackgroundTasks, user: dict = Depends(get_user_from_api_key)):
    """Submit an outcome for an agent"""
    # Verify agent belongs to user
    agent = await db.agents.find_one(
        {"agent_id": agent_id, "user_id": user["id"]}, 
        {"_id": 0}
    )
    if not agent:
        # Check if agent exists but belongs to another user
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
    
    outcome_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    outcome_doc = {
        "id": outcome_id,
        "agent_id": agent_id,
        "result": data.result,
        "task_type": data.task_type,
        "submitter_type": data.submitter_type,
        "created_at": now
    }
    
    await db.outcomes.insert_one(outcome_doc)
    
    # Calculate new score for notifications and webhooks
    outcomes = await db.outcomes.find(
        {"agent_id": agent_id}, 
        {"_id": 0}
    ).to_list(10000)
    new_score, new_tier, _ = calculate_score_and_tier(outcomes)
    
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
            "score": new_score,
            "tier": new_tier,
            "created_at": now
        }
    )
    
    return OutcomeResponse(
        id=outcome_id,
        agent_id=agent_id,
        result=data.result,
        task_type=data.task_type,
        submitter_type=data.submitter_type,
        created_at=now
    )

@v1_router.get("/agents/{agent_id}/outcomes", response_model=List[OutcomeResponse])
async def list_outcomes(agent_id: str, user: dict = Depends(get_user_from_api_key)):
    """List outcomes for an agent"""
    # Verify agent belongs to user
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
    ).sort("created_at", -1).to_list(1000)
    
    return [OutcomeResponse(**o) for o in outcomes]

@v1_router.get("/agents/{agent_id}/score", response_model=ScoreResponse)
async def get_agent_score(agent_id: str, user: dict = Depends(get_user_from_api_key)):
    """Get computed score and tier for an agent"""
    # Verify agent belongs to user
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
    
    score, tier, success_rate = calculate_score_and_tier(outcomes)
    
    return ScoreResponse(
        agent_id=agent_id,
        score=score,
        tier=tier,
        outcome_count=len(outcomes),
        success_rate=success_rate
    )

def generate_badge_svg(tier: str, score: float) -> str:
    """Generate SVG badge for agent tier and score"""
    # Tier colors from brand guide
    tier_colors = {
        "Unrated": {"bg": "#4B5563", "text": "#E5E7EB"},
        "Bronze": {"bg": "#CD7F32", "text": "#1F2937"},
        "Silver": {"bg": "#C0C0C0", "text": "#1F2937"},
        "Gold": {"bg": "#FFD700", "text": "#1F2937"},
        "Platinum": {"bg": "#01696F", "text": "#ECFEFF"},
    }
    
    colors = tier_colors.get(tier, tier_colors["Unrated"])
    score_display = str(int(score)) if score == int(score) else str(round(score, 1))
    
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="120" height="28" viewBox="0 0 120 28">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#0C1116"/>
      <stop offset="100%" style="stop-color:#111827"/>
    </linearGradient>
  </defs>
  <rect width="120" height="28" rx="6" fill="url(#bg)" stroke="#1F2933" stroke-width="1"/>
  <rect x="4" y="4" width="52" height="20" rx="4" fill="{colors['bg']}"/>
  <text x="30" y="17.5" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="600" fill="{colors['text']}" text-anchor="middle">{tier}</text>
  <text x="86" y="18" font-family="ui-monospace, monospace" font-size="13" font-weight="700" fill="#F9FAFB" text-anchor="middle">{score_display}</text>
</svg>'''
    return svg

@v1_router.get("/agents/{agent_id}/badge.svg")
async def get_agent_badge(agent_id: str):
    """
    Get embeddable SVG badge for an agent.
    This is a PUBLIC endpoint - no authentication required for embedding.
    """
    # Look up agent (no user check - public endpoint)
    agent = await db.agents.find_one({"agent_id": agent_id}, {"_id": 0})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Get outcomes and calculate score
    outcomes = await db.outcomes.find(
        {"agent_id": agent_id}, 
        {"_id": 0}
    ).to_list(10000)
    
    score, tier, _ = calculate_score_and_tier(outcomes)
    
    # Generate SVG
    svg = generate_badge_svg(tier, score)
    
    return Response(
        content=svg,
        media_type="image/svg+xml",
        headers={
            "Cache-Control": "public, max-age=300",  # Cache for 5 minutes
            "Content-Type": "image/svg+xml; charset=utf-8"
        }
    )

# ============== WEBHOOK ROUTES ==============

@v1_router.post("/webhooks", response_model=WebhookResponse, status_code=201)
async def create_webhook(data: WebhookCreate, user: dict = Depends(get_user_from_api_key)):
    """Create a new webhook subscription"""
    # Validate URL format
    if not data.url.startswith(("http://", "https://")):
        raise APIError(
            code=ErrorCodes.INVALID_URL,
            message="Webhook URL must start with http:// or https://",
            status_code=400,
            details={"field": "url", "value": data.url}
        )
    
    # Check for duplicate URL
    existing = await db.webhooks.find_one(
        {"user_id": user["id"], "url": data.url, "is_active": True}
    )
    if existing:
        raise APIError(
            code=ErrorCodes.DUPLICATE_WEBHOOK_URL,
            message="This webhook URL is already registered. Each URL can only be used once.",
            status_code=400,
            details={"url": data.url}
        )
    
    # Limit number of webhooks per user
    count = await db.webhooks.count_documents({"user_id": user["id"], "is_active": True})
    if count >= 10:
        raise APIError(
            code=ErrorCodes.WEBHOOK_LIMIT_REACHED,
            message="You have reached the maximum of 10 active webhooks. Delete an existing webhook to add a new one.",
            status_code=400,
            details={"current_count": count, "max_allowed": 10}
        )
    
    webhook_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Validate event types
    valid_events = ["outcome.created"]
    invalid_events = [e for e in data.events if e not in valid_events]
    if invalid_events:
        raise APIError(
            code=ErrorCodes.INVALID_ENUM_VALUE,
            message=f"Invalid event type(s): {', '.join(invalid_events)}. Supported events: {', '.join(valid_events)}",
            status_code=400,
            details={"invalid_events": invalid_events, "valid_events": valid_events}
        )
    
    webhook_doc = {
        "id": webhook_id,
        "user_id": user["id"],
        "url": data.url,
        "events": data.events,
        "description": data.description,
        "is_active": True,
        "created_at": now
    }
    
    await db.webhooks.insert_one(webhook_doc)
    
    return WebhookResponse(
        id=webhook_id,
        url=data.url,
        events=data.events,
        description=data.description,
        created_at=now,
        is_active=True
    )

@v1_router.get("/webhooks", response_model=WebhookListResponse)
async def list_webhooks(user: dict = Depends(get_user_from_api_key)):
    """List all webhooks for the authenticated user"""
    webhooks = await db.webhooks.find(
        {"user_id": user["id"], "is_active": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return WebhookListResponse(
        webhooks=[WebhookResponse(**w) for w in webhooks]
    )

@v1_router.get("/webhooks/{webhook_id}", response_model=WebhookResponse)
async def get_webhook(webhook_id: str, user: dict = Depends(get_user_from_api_key)):
    """Get a specific webhook"""
    webhook = await db.webhooks.find_one(
        {"id": webhook_id, "user_id": user["id"], "is_active": True},
        {"_id": 0}
    )
    if not webhook:
        raise APIError(
            code=ErrorCodes.WEBHOOK_NOT_FOUND,
            message="Webhook not found or has been deleted.",
            status_code=404,
            details={"webhook_id": webhook_id}
        )
    
    return WebhookResponse(**webhook)

@v1_router.delete("/webhooks/{webhook_id}", status_code=204)
async def delete_webhook(webhook_id: str, user: dict = Depends(get_user_from_api_key)):
    """Delete (deactivate) a webhook"""
    webhook = await db.webhooks.find_one(
        {"id": webhook_id, "user_id": user["id"]}
    )
    if not webhook:
        raise APIError(
            code=ErrorCodes.WEBHOOK_NOT_FOUND,
            message="Webhook not found.",
            status_code=404,
            details={"webhook_id": webhook_id}
        )
    
    await db.webhooks.update_one(
        {"id": webhook_id},
        {"$set": {"is_active": False, "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return Response(status_code=204)

# ============== PASSWORD RESET ROUTES ==============

@api_router.post("/auth/password-reset/request")
async def request_password_reset(data: PasswordResetRequest, background_tasks: BackgroundTasks):
    """Request a password reset email"""
    user = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If an account exists with this email, a reset link has been sent."}
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc).timestamp() + 3600  # 1 hour
    
    # Store reset token
    await db.password_resets.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "token": reset_token,
        "expires_at": expires_at,
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Send reset email
    reset_url = f"https://repledger.agentictrust.app/reset-password?token={reset_token}"
    background_tasks.add_task(send_password_reset_email, data.email.lower(), reset_token, reset_url)
    
    return {"message": "If an account exists with this email, a reset link has been sent."}

@api_router.post("/auth/password-reset/confirm")
async def confirm_password_reset(data: PasswordResetConfirm):
    """Confirm password reset with token"""
    reset_doc = await db.password_resets.find_one(
        {"token": data.token, "used": False},
        {"_id": 0}
    )
    
    if not reset_doc:
        raise APIError(
            code=ErrorCodes.RESET_TOKEN_INVALID,
            message="This reset link is invalid or has already been used. Please request a new password reset.",
            status_code=400
        )
    
    # Check expiration
    if datetime.now(timezone.utc).timestamp() > reset_doc["expires_at"]:
        raise APIError(
            code=ErrorCodes.RESET_TOKEN_EXPIRED,
            message="This reset link has expired. Please request a new password reset.",
            status_code=400
        )
    
    # Update password
    await db.users.update_one(
        {"id": reset_doc["user_id"]},
        {"$set": {"password_hash": hash_password(data.new_password)}}
    )
    
    # Mark token as used
    await db.password_resets.update_one(
        {"token": data.token},
        {"$set": {"used": True, "used_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Password has been reset successfully"}

# ============== BASIC ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "RepLedger API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include routers
app.include_router(api_router)
app.include_router(v1_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
