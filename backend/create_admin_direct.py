#!/usr/bin/env python3
"""
Script to create admin user directly in the database.
This bypasses API authentication by using the database directly.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.base import SessionLocal
from app.crud import user as crud_user
from app.schemas.user import UserCreate
from app.core.security import get_password_hash

def create_admin_direct():
    """Create admin user directly in the database"""
    
    db = SessionLocal()
    try:
        # Check if admin already exists
        existing_user = crud_user.get_user_by_username(db, username="admin")
        if existing_user:
            print("✅ Admin user already exists!")
            print(f"Username: {existing_user.username}")
            print(f"Email: {existing_user.email}")
            print(f"Role: {existing_user.role}")
            return
        
        # Create admin user data
        admin_data = UserCreate(
            email="admin@lims.com",
            username="admin",
            full_name="Admin User",
            role="super_admin",
            password="Admin123!"
        )
        
        # Create the user
        user = crud_user.create_user(db, admin_data.dict())
        
        print("✅ Admin user created successfully!")
        print(f"Username: {user.username}")
        print(f"Email: {user.email}")
        print(f"Role: {user.role}")
        print("Password: Admin123!")
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_direct()
