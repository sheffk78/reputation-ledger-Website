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


settings = Settings()
