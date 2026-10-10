from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "LIMS System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    DATABASE_URL: str = "sqlite:///./nyu_lims.db"

    # Comma-separated list of allowed frontend origins
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # Credentials come from environment variables (set them in the Render dashboard)
    ADMIN_PASSWORD: str = "change-me-locally"
    SYSTEM_PASSWORD: str = "change-me-locally"

    # When true, an empty database is filled with demo data on startup
    DEMO_SEED: bool = False
    
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 720
    
    # CFR Part 11 Compliance Settings
    PASSWORD_MIN_LENGTH: int = 8
    PASSWORD_REQUIRE_UPPERCASE: bool = True
    PASSWORD_REQUIRE_LOWERCASE: bool = True
    PASSWORD_REQUIRE_NUMBERS: bool = True
    PASSWORD_REQUIRE_SPECIAL: bool = True
    PASSWORD_HISTORY_COUNT: int = 5
    MAX_LOGIN_ATTEMPTS: int = 5
    ACCOUNT_LOCKOUT_MINUTES: int = 30
    SESSION_TIMEOUT_MINUTES: int = 30
    
    class Config:
        env_file = ".env"
        extra = "ignore"  # This will ignore any extra fields in the environment

    @property
    def cors_origins_list(self) -> list:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

settings = Settings()