import uuid
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks

from core.database import db
from core.dependencies import get_current_user, create_token
from core.exceptions import APIError, ErrorCodes
from models.auth import (
    UserCreate, UserLogin, UserResponse, TokenResponse,
    ApiKeyResponse, PasswordResetRequest, PasswordResetConfirm
)
from utils.password import hash_password, verify_password
from services.email_service import send_welcome_email, send_password_reset_email
from services.audit_service import (
    log_user_signup, log_user_login, 
    log_api_key_created, log_api_key_regenerated
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse)
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
    
    # Audit logging in background
    background_tasks.add_task(log_user_signup, user_id, data.email.lower())
    background_tasks.add_task(log_api_key_created, user_id, data.email.lower(), api_key_doc["id"])
    
    token = create_token(user_id, data.email.lower())
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id, 
            email=data.email.lower(), 
            created_at=now, 
            is_admin=False,
            organization_id=None,
            plan="free"
        )
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, background_tasks: BackgroundTasks):
    """Login with email and password"""
    user = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise APIError(
            code=ErrorCodes.INVALID_CREDENTIALS,
            message="Invalid email or password. Please check your credentials and try again.",
            status_code=401
        )
    
    # Audit logging in background
    background_tasks.add_task(log_user_login, user["id"], user["email"])
    
    token = create_token(user["id"], user["email"])
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"], 
            email=user["email"], 
            created_at=user["created_at"],
            is_admin=user.get("is_admin", False),
            organization_id=user.get("organization_id"),
            plan=user.get("plan", "free")
        )
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    """Get current user info"""
    return UserResponse(
        id=user["id"], 
        email=user["email"], 
        created_at=user["created_at"],
        is_admin=user.get("is_admin", False),
        organization_id=user.get("organization_id"),
        plan=user.get("plan", "free")
    )


@router.post("/password-reset/request")
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
    reset_url = f"https://rep-ledger-mvp.preview.emergentagent.com/reset-password?token={reset_token}"
    background_tasks.add_task(send_password_reset_email, data.email.lower(), reset_token, reset_url)
    
    return {"message": "If an account exists with this email, a reset link has been sent."}


@router.post("/password-reset/confirm")
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


# API Key routes (non-auth prefix but related)
api_key_router = APIRouter(tags=["api-key"])


@api_key_router.get("/api-key", response_model=ApiKeyResponse)
async def get_api_key(user: dict = Depends(get_current_user)):
    """Get the current user's API key"""
    api_key = await db.api_keys.find_one(
        {"user_id": user["id"], "revoked_at": None},
        {"_id": 0}
    )
    if not api_key:
        raise HTTPException(status_code=404, detail="No API key found")
    
    return ApiKeyResponse(api_key=api_key["key"], created_at=api_key["created_at"])


@api_key_router.post("/api-key/regenerate", response_model=ApiKeyResponse)
async def regenerate_api_key(user: dict = Depends(get_current_user), background_tasks: BackgroundTasks = None):
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
    
    # Audit logging in background
    if background_tasks:
        background_tasks.add_task(log_api_key_regenerated, user["id"], user["email"], api_key_doc["id"])
    
    return ApiKeyResponse(api_key=api_key, created_at=now)
