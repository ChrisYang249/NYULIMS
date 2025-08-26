from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api import deps
from app.core import security
from app.core.config import settings
from app.crud import user as crud_user
from app.schemas.token import Token
from app.schemas.user import User
from pydantic import BaseModel

router = APIRouter()

class PasswordValidation(BaseModel):
    password: str

@router.post("/login", response_model=Token)
async def login(
    db: Session = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """OAuth2 compatible token login"""
    user = crud_user.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role
        }
    }

@router.get("/me", response_model=User)
async def read_users_me(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get current user"""
    return current_user

@router.post("/validate-password")
async def validate_password(
    password_data: PasswordValidation,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Validate current user's password for electronic signatures"""
    # Use the same authenticate function to validate password
    user = crud_user.authenticate_user(db, current_user.username, password_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password",
        )
    return {"valid": True}

@router.post("/create-admin")
async def create_admin_user(
    db: Session = Depends(deps.get_db),
) -> Any:
    """Create admin user if it doesn't exist (temporary endpoint for setup)"""
    try:
        # Check if admin already exists
        existing = crud_user.get_user_by_username(db, "admin")
        if existing:
            return {"message": "Admin user already exists", "username": existing.username}
        
        # Create admin user
        user_data = {
            "email": "admin@lims.com",
            "username": "admin",
            "full_name": "Admin User",
            "role": "super_admin",
            "password": "Admin123!"
        }
        
        user = crud_user.create_user(db, user_data)
        return {
            "message": "Admin user created successfully",
            "username": user.username,
            "email": user.email,
            "role": user.role
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating admin user: {str(e)}",
        )

