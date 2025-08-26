#!/usr/bin/env python3
"""
Simple script to create admin user directly in the database.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.base import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

def create_admin():
    """Create admin user directly in the database"""
    
    db = SessionLocal()
    try:
        # Check if admin already exists
        existing_user = db.query(User).filter(User.username == "admin").first()
        if existing_user:
            print("✅ Admin user already exists!")
            print(f"Username: {existing_user.username}")
            print(f"Email: {existing_user.email}")
            print(f"Role: {existing_user.role}")
            return
        
        # Create admin user
        admin_user = User(
            email="admin@lims.com",
            username="admin",
            full_name="Admin User",
            hashed_password=get_password_hash("Admin123!"),
            role="super_admin",
            is_active=True
        )
        
        db.add(admin_user)
        db.commit()
        
        print("✅ Admin user created successfully!")
        print("Username: admin")
        print("Password: Admin123!")
        print("Email: admin@lims.com")
        print("Role: super_admin")
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()