from datetime import datetime, timezone
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

from .config import settings
from .database import db
from .exceptions import APIError, ErrorCodes

security = HTTPBearer(auto_error=False)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token"""
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
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


def create_token(user_id: str, email: str) -> str:
    """Create a new JWT token"""
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc).timestamp() + (settings.JWT_EXPIRATION_HOURS * 3600)
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


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
    """Get user from API key or JWT token (for v1 API endpoints)"""
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
        # Update last_used_at timestamp
        await db.api_keys.update_one(
            {"id": api_key_doc["id"]},
            {"$set": {"last_used_at": datetime.now(timezone.utc).isoformat()}}
        )
        user = await db.users.find_one({"id": api_key_doc["user_id"]}, {"_id": 0})
        if user:
            return user
    
    raise APIError(
        code=ErrorCodes.INVALID_API_KEY,
        message="Invalid API key or token. Check your credentials and try again.",
        status_code=401
    )


async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Get admin user from JWT token OR admin API key.
    
    Supports two auth methods:
    1. JWT token from browser login (user must have is_admin: true)
    2. Static admin API key from ADMIN_API_KEY env var (for programmatic access by Kit)
    
    When using admin API key, returns a synthetic admin user dict with:
    - id: "admin_api_key"
    - email: "kit@agentictrust.com"
    - is_admin: True
    """
    if not credentials:
        raise APIError(
            code=ErrorCodes.MISSING_TOKEN,
            message="Authentication required. Please sign in.",
            status_code=401
        )
    
    token = credentials.credentials
    
    # First, check if it's the admin API key
    if settings.ADMIN_API_KEY and token == settings.ADMIN_API_KEY:
        return {
            "id": "admin_api_key",
            "email": "kit@agentictrust.com",
            "is_admin": True
        }
    
    # Otherwise, try JWT token
    payload = decode_token(token)
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    
    if not user:
        raise APIError(
            code=ErrorCodes.USER_NOT_FOUND,
            message="User account not found.",
            status_code=401
        )
    
    # Check admin flag
    if not user.get("is_admin", False):
        raise APIError(
            code=ErrorCodes.ADMIN_ACCESS_REQUIRED,
            message="Admin access required. You do not have permission to access this resource.",
            status_code=403
        )
    
    return user
