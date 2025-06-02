"""Create lab technician users for testing"""
from app.models import User
from app.db.base import SessionLocal
from app.core.security import get_password_hash

db = SessionLocal()

# Create lab users
lab_users = [
    {
        "username": "jsmith",
        "email": "jsmith@lab.com",
        "full_name": "John Smith",
        "role": "lab_tech",
        "password": "LabTech123!"
    },
    {
        "username": "jdoe", 
        "email": "jdoe@lab.com",
        "full_name": "Jane Doe",
        "role": "lab_tech",
        "password": "LabTech123!"
    },
    {
        "username": "mjohnson",
        "email": "mjohnson@lab.com", 
        "full_name": "Mike Johnson",
        "role": "lab_manager",
        "password": "LabManager123!"
    },
    {
        "username": "swilliams",
        "email": "swilliams@lab.com",
        "full_name": "Sarah Williams", 
        "role": "lab_tech",
        "password": "LabTech123!"
    }
]

for user_data in lab_users:
    # Check if user exists
    existing = db.query(User).filter(User.username == user_data["username"]).first()
    if not existing:
        user = User(
            username=user_data["username"],
            email=user_data["email"],
            full_name=user_data["full_name"],
            role=user_data["role"],
            hashed_password=get_password_hash(user_data["password"]),
            is_active=True
        )
        db.add(user)
        print(f"Created user: {user_data['username']}")
    else:
        print(f"User already exists: {user_data['username']}")

db.commit()
print("Lab users created successfully!")
db.close()