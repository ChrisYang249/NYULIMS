from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

from app.core.config import settings

# Use SQLite for Render deployment, PostgreSQL for local development
if os.getenv("USE_SQLITE", "false").lower() == "true":
    # SQLite database (for Render free tier)
    DATABASE_URL = "sqlite:///./nyu_lims.db"
    engine = create_engine(
        DATABASE_URL, 
        connect_args={"check_same_thread": False}
    )
else:
    # PostgreSQL database (for local development)
    engine = create_engine(settings.DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=True, bind=engine)

Base = declarative_base()