from typing import Optional, Dict, Any
from pydantic import BaseModel


class ErrorDetail(BaseModel):
    """Standard error detail structure"""
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """Standard error response wrapper"""
    error: ErrorDetail


class ErrorCodes:
    """Centralized error codes"""
    # Auth errors
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    TOKEN_INVALID = "TOKEN_INVALID"
    MISSING_TOKEN = "MISSING_TOKEN"
    INVALID_API_KEY = "INVALID_API_KEY"
    EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS"
    
    # Validation errors
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_EMAIL = "INVALID_EMAIL"
    PASSWORD_TOO_SHORT = "PASSWORD_TOO_SHORT"
    FIELD_REQUIRED = "FIELD_REQUIRED"
    INVALID_ENUM_VALUE = "INVALID_ENUM_VALUE"
    INVALID_URL = "INVALID_URL"
    
    # Resource errors
    AGENT_NOT_FOUND = "AGENT_NOT_FOUND"
    WEBHOOK_NOT_FOUND = "WEBHOOK_NOT_FOUND"
    USER_NOT_FOUND = "USER_NOT_FOUND"
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND"
    FLAG_NOT_FOUND = "FLAG_NOT_FOUND"
    OUTCOME_NOT_FOUND = "OUTCOME_NOT_FOUND"
    
    # Business logic errors
    WEBHOOK_LIMIT_REACHED = "WEBHOOK_LIMIT_REACHED"
    DUPLICATE_WEBHOOK_URL = "DUPLICATE_WEBHOOK_URL"
    RESET_TOKEN_INVALID = "RESET_TOKEN_INVALID"
    RESET_TOKEN_EXPIRED = "RESET_TOKEN_EXPIRED"
    
    # Billing errors
    PLAN_LIMIT_REACHED = "PLAN_LIMIT_REACHED"
    
    # Admin errors
    ADMIN_ACCESS_REQUIRED = "ADMIN_ACCESS_REQUIRED"


class APIError(Exception):
    """Custom API exception with standardized error format"""
    def __init__(
        self, 
        code: str, 
        message: str, 
        status_code: int = 400,
        details: Optional[Dict[str, Any]] = None
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)


def create_error_response(code: str, message: str, details: Optional[Dict[str, Any]] = None) -> dict:
    """Create a standardized error response dict"""
    response = {
        "error": {
            "code": code,
            "message": message
        }
    }
    if details:
        response["error"]["details"] = details
    return response
