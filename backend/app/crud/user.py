from sqlalchemy.orm import Session
from datetime import datetime
import json

from app.models import User
from app.core.security import get_password_hash, verify_password

def get_user(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(User).offset(skip).limit(limit).all()

def create_user(db: Session, user_data: dict):
    hashed_password = get_password_hash(user_data["password"])
    del user_data["password"]
    
    db_user = User(
        **user_data,
        hashed_password=hashed_password,
        password_history=json.dumps([hashed_password])
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, username: str, password: str):
    user = get_user_by_username(db, username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        # Increment failed login attempts
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= 5:  # Should use settings
            user.is_locked = True
        db.commit()
        return None
    
    # Reset failed attempts on successful login
    user.failed_login_attempts = 0
    user.last_login = datetime.utcnow()
    db.commit()
    
    return user

def update_user_password(db: Session, user: User, new_password: str):
    """Update user's password and maintain password history"""
    from app.core.security import get_password_hash
    
    # Hash the new password
    new_hashed_password = get_password_hash(new_password)
    
    # Get current password history
    try:
        password_history = json.loads(user.password_history) if user.password_history else []
    except json.JSONDecodeError:
        password_history = []
    
    # Add current password to history (keep last 5 passwords)
    if user.hashed_password:
        password_history.append(user.hashed_password)
        if len(password_history) > 5:
            password_history = password_history[-5:]
    
    # Update user's password and history
    user.hashed_password = new_hashed_password
    user.password_history = json.dumps(password_history)
    user.last_password_change = datetime.utcnow()
    
    db.commit()
    db.refresh(user)
    return user