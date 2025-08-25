from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

from app.core.config import settings

# Use SQLite for free deployment, PostgreSQL for paid
if os.getenv("USE_SQLITE", "false").lower() == "true":
    # SQLite database (free forever)
    DATABASE_URL = "sqlite:///./nyu_lims.db"
    engine = create_engine(
        DATABASE_URL, 
        connect_args={"check_same_thread": False}
    )
else:
    # PostgreSQL database (paid after 90 days)
    engine = create_engine(settings.DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=True, bind=engine)

Base = declarative_base()