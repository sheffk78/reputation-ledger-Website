from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import bcrypt
import jwt
import secrets

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
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

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
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = credentials.credentials
    payload = decode_token(token)
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_user_from_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get user from API key (for v1 endpoints)"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = credentials.credentials
    
    # First try JWT token
    try:
        payload = decode_token(token)
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if user:
            return user
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, HTTPException):
        pass
    
    # Then try API key
    api_key_doc = await db.api_keys.find_one({"key": token, "revoked_at": None}, {"_id": 0})
    if api_key_doc:
        user = await db.users.find_one({"id": api_key_doc["user_id"]}, {"_id": 0})
        if user:
            return user
    
    raise HTTPException(status_code=401, detail="Invalid credentials")

# ============== AUTH ROUTES ==============

@api_router.post("/auth/signup", response_model=TokenResponse)
async def signup(data: UserCreate):
    """Create a new user account"""
    # Check if user exists
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Create user
    user_doc = {
        "id": user_id,
        "email": data.email.lower(),
        "password_hash": hash_password(data.password),
        "created_at": now
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
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
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
        raise HTTPException(status_code=404, detail="Agent not found")
    
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
async def create_outcome(agent_id: str, data: OutcomeCreate, user: dict = Depends(get_user_from_api_key)):
    """Submit an outcome for an agent"""
    # Verify agent belongs to user
    agent = await db.agents.find_one(
        {"agent_id": agent_id, "user_id": user["id"]}, 
        {"_id": 0}
    )
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
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
        raise HTTPException(status_code=404, detail="Agent not found")
    
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
        raise HTTPException(status_code=404, detail="Agent not found")
    
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
