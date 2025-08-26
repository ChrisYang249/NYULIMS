from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import time
import logging
from sqlalchemy import text

from app.core.config import settings
from app.api.api_v1.api import api_router
from app.db.base import engine, Base
from app.models import *  # Import all models

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
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:5173",  # React dev servers
        "https://nyulims.vercel.app",  # Vercel frontend
        "https://*.vercel.app"  # Any Vercel subdomain
    ],
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

@app.get("/health")
async def health_check():
    """Health check endpoint that ensures admin user exists"""
    from app.db.base import SessionLocal
    from app.crud import user as crud_user
    
    try:
        db = SessionLocal()
        # Check if admin user exists, create if not
        admin_user = crud_user.get_user_by_username(db, "admin")
        if not admin_user:
            # Create admin user
            user_data = {
                "email": "admin@lims.com",
                "username": "admin",
                "full_name": "Admin User",
                "role": "super_admin",
                "password": "Admin123!"
            }
            crud_user.create_user(db, user_data)
            admin_created = True
        else:
            admin_created = False
        
        db.close()
        
        return {
            "status": "healthy",
            "admin_user_exists": True,
            "admin_created": admin_created,
            "admin_username": "admin",
            "message": "LIMS system is running and admin access is guaranteed"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "admin_user_exists": False
        }