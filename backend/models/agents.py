from pydantic import BaseModel, Field
from typing import Optional


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
    is_public: bool = False


class AgentPublicToggle(BaseModel):
    """Request to toggle public visibility"""
    is_public: bool


class AgentPublicProfile(BaseModel):
    """Public-facing agent profile (limited data)"""
    agent_id: str
    name: str
    description: Optional[str] = None
    owner_handle: Optional[str] = None
    score: float
    tier: str
    outcome_count: int
    success_rate: float
    breakdown: dict


class DemoAgentResponse(BaseModel):
    agent: AgentListResponse
    message: str
    is_new: bool


class UsageStatsResponse(BaseModel):
    """Usage statistics for dashboard overview"""
    total_agents: int
    total_outcomes: int
    outcomes_last_7_days: int
    avg_score: float  # Average across agents with >= 5 outcomes, 0 if none qualify
