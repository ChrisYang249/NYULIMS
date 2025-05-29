#!/usr/bin/env python3
"""Test script for project deletion functionality"""
import requests
import json

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
SUPER_ADMIN_EMAIL = "admin@example.com"
SUPER_ADMIN_PASSWORD = "admin123"
PM_EMAIL = "pm@example.com"  # You'll need to create this user first
PM_PASSWORD = "pm123"

def login(email, password):
    """Login and get access token"""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": email, "password": password}
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Login failed for {email}: {response.text}")
        return None

def test_delete_as_super_admin(token, project_id):
    """Test deletion as super admin (no reason required)"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.delete(
        f"{BASE_URL}/projects/{project_id}",
        headers=headers
    )
    print(f"Super Admin Delete (no reason): Status {response.status_code}")
    if response.status_code == 200:
        print(f"Success: {response.json()}")
    else:
        print(f"Error: {response.text}")

def test_delete_as_pm_without_reason(token, project_id):
    """Test deletion as PM without reason (should fail)"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.delete(
        f"{BASE_URL}/projects/{project_id}",
        headers=headers
    )
    print(f"PM Delete (no reason): Status {response.status_code}")
    print(f"Response: {response.text}")

def test_delete_as_pm_with_reason(token, project_id):
    """Test deletion as PM with reason (should succeed)"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.delete(
        f"{BASE_URL}/projects/{project_id}",
        headers=headers,
        params={"reason": "Client cancelled the project due to budget constraints"}
    )
    print(f"PM Delete (with reason): Status {response.status_code}")
    if response.status_code == 200:
        print(f"Success: {response.json()}")
    else:
        print(f"Error: {response.text}")

def get_test_project_id(token):
    """Get a project ID for testing"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/projects", headers=headers)
    if response.status_code == 200:
        projects = response.json()
        # Find a project that's not already cancelled
        for project in projects:
            if project['status'] != 'cancelled':
                return project['id']
    return None

if __name__ == "__main__":
    print("Testing Project Deletion Functionality")
    print("=" * 50)
    
    # Login as super admin
    admin_token = login(SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD)
    if not admin_token:
        print("Failed to login as super admin")
        exit(1)
    
    # Get a test project
    project_id = get_test_project_id(admin_token)
    if not project_id:
        print("No suitable project found for testing")
        exit(1)
    
    print(f"\nTesting with project ID: {project_id}")
    print("-" * 50)
    
    # Test 1: Super admin can delete without reason
    print("\nTest 1: Super Admin deleting without reason")
    test_delete_as_super_admin(admin_token, project_id)
    
    print("\nNote: To test PM deletion, you need to:")
    print("1. Create a PM user first")
    print("2. Find a non-cancelled project") 
    print("3. Uncomment and run the PM tests below")
    
    # # Test 2: PM cannot delete without reason
    # pm_token = login(PM_EMAIL, PM_PASSWORD)
    # if pm_token:
    #     print("\nTest 2: PM deleting without reason (should fail)")
    #     test_delete_as_pm_without_reason(pm_token, project_id)
    #     
    #     print("\nTest 3: PM deleting with reason (should succeed)")
    #     test_delete_as_pm_with_reason(pm_token, project_id)