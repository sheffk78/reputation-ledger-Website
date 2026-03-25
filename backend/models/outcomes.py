from pydantic import BaseModel, Field
from typing import List


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


class PaginatedOutcomesResponse(BaseModel):
    data: List[OutcomeResponse]
    page: int
    limit: int
    total: int


class ScoreResponse(BaseModel):
    agent_id: str
    score: float
    tier: str
    outcome_count: int
    success_rate: float
