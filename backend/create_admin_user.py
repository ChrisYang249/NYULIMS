#!/usr/bin/env python3
"""
Script to create admin user for the deployed LIMS system.
Run this locally to create the admin user in your Render database.
"""

import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import logging

# Add the current directory to Python path to import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.crud.user import create_user, get_user_by_username
from app.core.config import settings

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_admin():
    """Create admin user in the database"""
    
    try:
        # Create database connection
        engine = create_engine(settings.DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=True, bind=engine)
        db = SessionLocal()
        
        logger.info("Connected to database successfully")
        
        # Check if admin already exists
        existing_admin = get_user_by_username(db, "admin")
        if existing_admin:
            logger.info("Admin user already exists!")
            logger.info(f"Username: {existing_admin.username}")
            logger.info(f"Email: {existing_admin.email}")
            logger.info(f"Role: {existing_admin.role}")
            return
        
        # Create admin user
        user_data = {
            "email": "admin@lims.com",
            "username": "admin",
            "full_name": "Admin User",
            "role": "super_admin",
            "password": "Admin123!"
        }
        
        user = create_user(db, user_data)
        logger.info("Admin user created successfully!")
        logger.info(f"Username: {user.username}")
        logger.info(f"Email: {user.email}")
        logger.info(f"Role: {user.role}")
        logger.info("Password: Admin123!")
        
    except Exception as e:
        logger.error(f"Error creating admin user: {e}")
    finally:
        if 'db' in locals():
            db.close()

if __name__ == "__main__":
    create_admin()
