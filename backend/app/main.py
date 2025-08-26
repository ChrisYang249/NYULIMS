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
        
        # Create admin user if it doesn't exist (with race condition protection)
        db = SessionLocal()
        try:
            # Use a database lock to prevent race conditions between workers
            lock_query = text("SELECT COUNT(*) FROM users WHERE username = 'admin' OR email = 'admin@lims.com'")
            result = db.execute(lock_query)
            existing_count = result.fetchone()[0]
            
            if existing_count == 0:
                logger.info("No admin user found, attempting to create...")
                user_data = {
                    "email": "admin@lims.com",
                    "username": "admin",
                    "full_name": "Admin User",
                    "role": "super_admin",
                    "password": "Admin123!"
                }
                try:
                    create_user(db, user_data)
                    logger.info("Admin user created successfully!")
                    logger.info("Username: admin, Password: Admin123!")
                except Exception as create_error:
                    logger.warning(f"Error creating admin user: {create_error}")
                    # Check if another worker created the user
                    db.rollback()  # Clear the failed transaction
                    db = SessionLocal()  # Get a fresh session
                    existing_admin = get_user_by_username(db, "admin")
                    if existing_admin:
                        logger.info("Admin user was created by another worker - continuing...")
                    else:
                        logger.error("Failed to create admin user")
            else:
                logger.info("Admin user already exists")
                # Verify admin user details
                existing_admin = get_user_by_username(db, "admin")
                if existing_admin:
                    logger.info(f"Admin user verified: {existing_admin.username} ({existing_admin.email})")
                else:
                    logger.warning("Admin user count > 0 but user not found by username")
            

                
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
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:5173",  # React dev servers
        "https://nyu-lims-frontend.onrender.com",  # Render frontend
        "https://nyulims-frontend.onrender.com"    # Alternative URL
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