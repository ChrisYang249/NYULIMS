#!/usr/bin/env python3
"""Create multiple team users for LIMS system"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.base import SessionLocal
from app.crud.user import create_user, get_user_by_username

def main():
    print("Creating team users...")
    
    # Define your team members here
    team_members = [
        {
            "email": "lab.manager@nyu.edu",
            "username": "lab_manager",
            "full_name": "Lab Manager",
            "role": "admin",
            "password": "LabManager123!"
        },
        {
            "email": "technician1@nyu.edu",
            "username": "tech1",
            "full_name": "Lab Technician 1",
            "role": "lab_technician",
            "password": "Tech123!"
        },
        {
            "email": "technician2@nyu.edu",
            "username": "tech2",
            "full_name": "Lab Technician 2",
            "role": "lab_technician",
            "password": "Tech123!"
        },
        {
            "email": "researcher1@nyu.edu",
            "username": "researcher1",
            "full_name": "Research Assistant 1",
            "role": "researcher",
            "password": "Research123!"
        },
        {
            "email": "researcher2@nyu.edu",
            "username": "researcher2",
            "full_name": "Research Assistant 2",
            "role": "researcher",
            "password": "Research123!"
        }
    ]
    
    db = SessionLocal()
    try:
        created_count = 0
        for member in team_members:
            # Check if user already exists
            existing = get_user_by_username(db, member["username"])
            if existing:
                print(f"⚠️  User {member['username']} already exists")
                continue
            
            # Create user
            user = create_user(db, member)
            print(f"✅ Created user: {user.username} ({user.full_name})")
            created_count += 1
        
        print(f"\n🎉 Successfully created {created_count} new users!")
        print("\n📋 User Credentials:")
        print("=" * 50)
        for member in team_members:
            print(f"Username: {member['username']}")
            print(f"Password: {member['password']}")
            print(f"Role: {member['role']}")
            print("-" * 30)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
