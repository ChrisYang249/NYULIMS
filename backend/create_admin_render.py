#!/usr/bin/env python3
"""
Script to create admin user directly in the Render SQLite database.
This connects to your deployed backend database.
"""

import requests
import json

def create_admin_via_api():
    """Create admin user via the backend API"""
    
    # Your backend URL
    backend_url = "https://nyu-lims-backend.onrender.com"
    
    # Admin user data
    admin_data = {
        "email": "admin@lims.com",
        "username": "admin",
        "full_name": "Admin User",
        "role": "super_admin",
        "password": "Admin123!"
    }
    
    try:
        # First, check if backend is running
        print("Checking backend health...")
        health_response = requests.get(f"{backend_url}/")
        if health_response.status_code == 200:
            print("✅ Backend is running!")
        else:
            print(f"❌ Backend health check failed: {health_response.status_code}")
            return
        
        # Try to create admin user via API
        print("Creating admin user...")
        response = requests.post(
            f"{backend_url}/api/v1/admin/create-initial-admin",
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            print("✅ Admin user created successfully!")
            print("Username: admin")
            print("Password: Admin123!")
            print("Email: admin@lims.com")
        elif response.status_code == 422:
            print("❌ Validation error - check the data format")
            print(response.text)
        elif response.status_code == 409:
            print("✅ Admin user already exists!")
        else:
            print(f"❌ Error creating admin user: {response.status_code}")
            print(response.text)
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Connection error: {e}")
        print("Make sure your backend is running on Render")

if __name__ == "__main__":
    create_admin_via_api()
