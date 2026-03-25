"""
Audit Log Models

Minimal audit logging for compliance and security monitoring.
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from enum import Enum


class ActorType(str, Enum):
    USER = "user"
    ADMIN = "admin"
    SYSTEM = "system"


class EventType(str, Enum):
    # User events
    USER_SIGNUP = "user.signup"
    USER_LOGIN = "user.login"
    
    # API Key events
    API_KEY_CREATED = "api_key.created"
    API_KEY_REGENERATED = "api_key.regenerated"
    
    # Agent events
    AGENT_CREATED = "agent.created"
    AGENT_FLAGGED = "agent.flagged"
    AGENT_PUBLIC_TOGGLED = "agent.public_toggled"
    
    # Outcome events
    OUTCOME_LOGGED = "outcome.logged"


class AuditLogEntry(BaseModel):
    """Single audit log entry"""
    id: str
    timestamp: str
    actor_type: str
    actor_id: Optional[str] = None
    actor_email: Optional[str] = None  # Denormalized for display
    event_type: str
    metadata: Dict[str, Any] = {}
    description: Optional[str] = None  # Human-readable summary


class AuditLogListResponse(BaseModel):
    """Paginated audit log response"""
    logs: List[AuditLogEntry]
    page: int
    limit: int
    total: int
