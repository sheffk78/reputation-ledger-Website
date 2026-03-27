from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class OutcomeCreate(BaseModel):
    result: str = Field(..., pattern="^(success|failure|partial|timeout)$")
    task_type: str = Field(min_length=1, max_length=100)
    submitter_type: str = Field(..., pattern="^(self|operator)$")
    source: Optional[str] = "manual"  # manual, aav, safe_spend
    source_event_id: Optional[str] = None  # External event ID reference
    metadata: Optional[Dict[str, Any]] = None  # Additional event data


class OutcomeResponse(BaseModel):
    id: str
    agent_id: str
    result: str
    task_type: str
    submitter_type: str
    source: Optional[str] = "manual"
    source_event_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: str


class PaginatedOutcomesResponse(BaseModel):
    data: List[OutcomeResponse]
    page: int
    limit: int
    total: int


class OutcomeBreakdown(BaseModel):
    success: int = 0
    failure: int = 0
    partial: int = 0
    timeout: int = 0


class ScoreResponse(BaseModel):
    agent_id: str
    score: float
    tier: str
    outcome_count: int
    success_rate: float
    breakdown: OutcomeBreakdown
