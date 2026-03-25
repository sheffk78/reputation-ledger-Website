from pydantic import BaseModel, Field
from typing import List, Optional


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
