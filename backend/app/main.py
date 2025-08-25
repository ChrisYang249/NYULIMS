from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import time
import logging
from sqlalchemy import text

from app.core.config import settings
from app.api.api_v1.api import api_router
from app.db.base import engine, Base, SessionLocal
from app.models import *  # Import all models
from app.crud.user import create_user, get_user_by_username

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing database...")
    try:
        # Try to create tables, but don't fail if they already exist
        Base.metadata.create_all(bind=engine, checkfirst=True)
        logger.info("Database tables initialized successfully")
        
        # Create admin user if it doesn't exist
        db = SessionLocal()
        try:
            existing_admin = get_user_by_username(db, "admin")
            if not existing_admin:
                logger.info("Creating admin user...")
                user_data = {
                    "email": "admin@lims.com",
                    "username": "admin",
                    "full_name": "Admin User",
                    "role": "super_admin",
                    "password": "Admin123!"
                }
                create_user(db, user_data)
                logger.info("Admin user created successfully!")
                logger.info("Username: admin, Password: Admin123!")
            else:
                logger.info("Admin user already exists")
        except Exception as e:
            logger.warning(f"Error creating admin user: {e}")
        finally:
            db.close()
            
    except Exception as e:
        logger.warning(f"Database initialization warning: {e}")
        logger.info("Continuing with existing database schema...")
    yield
    # Shutdown
    logger.info("Shutting down...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Audit logging middleware
@app.middleware("http")
async def audit_log_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    # Log API access (you can expand this to save to database)
    logger.info(
        f"Path: {request.url.path} | Method: {request.method} | "
        f"Status: {response.status_code} | Duration: {process_time:.3f}s"
    )
    
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {"message": "LIMS System API", "version": settings.VERSION}