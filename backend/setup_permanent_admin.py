#!/usr/bin/env python3
"""Setup permanent admin user for LIMS system with custom credentials"""

import sys
import os
import getpass
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.base import SessionLocal
from app.crud.user import create_user, get_user_by_username

def validate_password(password):
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number"
    return True, "Password is valid"

def main():
    print("=== NYU LIMS Permanent Admin Setup ===")
    print("This script will create a permanent admin user for your LIMS system.")
    print()
    
    # Get admin credentials from user
    print("Please enter the admin credentials:")
    username = input("Username (default: admin): ").strip() or "admin"
    email = input("Email: ").strip()
    full_name = input("Full Name: ").strip()
    
    # Validate email
    if not email or "@" not in email:
        print("Error: Please provide a valid email address")
        return
    
    # Get and validate password
    while True:
        password = getpass.getpass("Password: ")
        confirm_password = getpass.getpass("Confirm Password: ")
        
        if password != confirm_password:
            print("Error: Passwords do not match")
            continue
        
        is_valid, message = validate_password(password)
        if not is_valid:
            print(f"Error: {message}")
            continue
        
        break
    
    print(f"\nCreating admin user: {username}")
    print(f"Email: {email}")
    print(f"Full Name: {full_name}")
    print()
    
    # Confirm creation
    confirm = input("Proceed with creating this admin user? (y/N): ").strip().lower()
    if confirm != 'y':
        print("Admin user creation cancelled.")
        return
    
    db = SessionLocal()
    try:
        # Check if admin already exists
        existing = get_user_by_username(db, username)
        if existing:
            print(f"Error: User '{username}' already exists!")
            print("If you want to reset the password, please use the password reset functionality.")
            return
        
        # Create admin user
        user_data = {
            "email": email,
            "username": username,
            "full_name": full_name,
            "role": "super_admin",
            "password": password
        }
        
        user = create_user(db, user_data)
        print(f"\n✅ Admin user created successfully!")
        print(f"Username: {user.username}")
        print(f"Email: {user.email}")
        print(f"Full Name: {user.full_name}")
        print(f"Role: {user.role}")
        print()
        print("You can now log into the LIMS system with these credentials.")
        print("Please save these credentials securely!")
        
    except Exception as e:
        print(f"Error creating user: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
