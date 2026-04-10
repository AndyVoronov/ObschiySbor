from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/obschiysbor"
    
    # JWT
    JWT_SECRET: str = os.getenv("JWT_SECRET", "change-me-in-production-obschiysbor-2024")
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 дней
    JWT_REFRESH_EXPIRE_DAYS: int = 30
    
    # File uploads
    UPLOAD_DIR: str = "/app/uploads"
    MAX_FILE_SIZE: int = 5 * 1024 * 1024  # 5MB
    ALLOWED_IMAGE_TYPES: set = {"image/jpeg", "image/png", "image/webp"}
    
    # Telegram
    TELEGRAM_BOT_TOKEN: str = ""
    
    # VK OAuth
    VK_CLIENT_ID: str = ""
    VK_CLIENT_SECRET: str = ""
    VK_REDIRECT_URI: str = ""
    
    # App
    DEBUG: bool = True
    CORS_ORIGINS: list = ["http://localhost:5173", "http://89.111.154.208"]
    API_V1_PREFIX: str = "/api/v1"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
