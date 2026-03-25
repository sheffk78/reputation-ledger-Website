from pydantic import BaseModel, Field
from typing import List, Optional


class FlagCreate(BaseModel):
    outcome_id: Optional[str] = None
    reason: str = Field(..., min_length=1, max_length=100)
    notes: Optional[str] = Field(default=None, max_length=1000)


class FlagResponse(BaseModel):
    id: str
    agent_id: str
    outcome_id: Optional[str] = None
    reason: str
    notes: Optional[str] = None
    created_by_user_id: str
    created_at: str


class FlagListResponse(BaseModel):
    flags: List[FlagResponse]
    total: int
