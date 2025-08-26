#!/usr/bin/env python3
"""Check and create admin user for production LIMS system"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.base import SessionLocal
from app.crud.user import create_user, get_user_by_username
from app.core.security import get_password_hash

def main():
    print("Checking admin user in production database...")
    
    db = SessionLocal()
    try:
        # Check if admin already exists
        existing = get_user_by_username(db, "admin")
        if existing:
            print("✅ Admin user already exists!")
            print(f"Username: {existing.username}")
            print(f"Email: {existing.email}")
            print(f"Role: {existing.role}")
            return
        
        print("❌ Admin user not found. Creating...")
        
        # Create admin user
        user_data = {
            "email": "admin@lims.com",
            "username": "admin",
            "full_name": "Admin User",
            "role": "super_admin",
            "password": "Admin123!"
        }
        
        user = create_user(db, user_data)
        print("✅ Admin user created successfully!")
        print(f"Username: admin")
        print(f"Password: Admin123!")
        print(f"Email: admin@lims.com")
        print("\nYou can now log in with these credentials!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
