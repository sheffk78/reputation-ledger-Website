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


class DemoAgentResponse(BaseModel):
    agent: AgentListResponse
    message: str
    is_new: bool
