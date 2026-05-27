import os
import secrets
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')


class Settings:
    """Application configuration settings"""
    
    # MongoDB
    MONGO_URL: str = os.environ['MONGO_URL']
    DB_NAME: str = os.environ['DB_NAME']
    
    # JWT
    JWT_SECRET: str = os.environ.get('JWT_SECRET', secrets.token_hex(32))
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24 * 7  # 7 days
    
    # CORS
    CORS_ORIGINS: str = os.environ.get('CORS_ORIGINS', '*')
    
    # Admin API Key (for programmatic admin access by Kit)
    ADMIN_API_KEY: str = os.environ.get('ADMIN_API_KEY', 'arl_admin_0a3f1a89c2b4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0')
    
    # Sandbox (public playground)
    SANDBOX_API_KEY: str = os.environ.get('SANDBOX_API_KEY', '')
    SANDBOX_USER_ID: str = os.environ.get('SANDBOX_USER_ID', '')
    
    # Stripe
    STRIPE_SECRET_KEY: str = os.environ.get('STRIPE_SECRET_KEY', '')
    STRIPE_WEBHOOK_SECRET: str = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
    STRIPE_PRICE_BUILDER: str = os.environ.get('STRIPE_PRICE_BUILDER', 'price_1TFZtj2lZzmsSFmdLenhOv65')
    STRIPE_PRICE_PLATFORM: str = os.environ.get('STRIPE_PRICE_PLATFORM', 'price_1TFZtn2lZzmsSFmdLDxFLwLI')


settings = Settings()
