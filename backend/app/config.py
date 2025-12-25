"""Application configuration settings."""
import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings from environment variables."""
    
    # Database settings
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:postgres@db:5432/sast_analyzer"
    )
    
    # Default LLM settings (can be overridden via UI)
    DEFAULT_LLM_URL: str = os.getenv("DEFAULT_LLM_URL", "http://localhost:1234/v1")
    DEFAULT_LLM_MODEL: str = os.getenv("DEFAULT_LLM_MODEL", "local-model")
    
    # Application settings
    APP_NAME: str = "SAST False Positive Analyzer"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
