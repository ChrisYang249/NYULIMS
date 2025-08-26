#!/usr/bin/env python3
"""Create initial admin user for LIMS system"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.base import SessionLocal
from app.crud.user import create_user

def main():
    print("Creating admin user...")
    
    db = SessionLocal()
    try:
        # Check if admin already exists
        from app.crud.user import get_user_by_username
        existing = get_user_by_username(db, "admin")
        if existing:
            print("Admin user already exists!")
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
        print(f"Admin user created successfully!")
        print(f"Username: admin")
        print(f"Password: Admin123!")
        print(f"Email: admin@lims.com")
        print("\nPlease change the password after first login!")
        
    except Exception as e:
        print(f"Error creating user: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()