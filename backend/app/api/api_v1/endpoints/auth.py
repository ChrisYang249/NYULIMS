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

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class SimpleLogin(BaseModel):
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
    """Ensure admin user exists with permanent credentials (safe to call anytime)"""
    try:
        # Check if admin already exists
        existing = crud_user.get_user_by_username(db, "admin")
        
        if existing:
            # Update existing admin user to ensure correct credentials
            existing.email = "admin@lims.com"
            existing.full_name = "Admin User"
            existing.role = "super_admin"
            existing.is_active = True
            existing.is_locked = False
            existing.failed_login_attempts = 0
            
            # Update password to ensure it's correct
            crud_user.update_user_password(db, existing, "Admin123!")
            
            db.commit()
            db.refresh(existing)
            
            return {
                "message": "Admin user updated successfully",
                "username": existing.username,
                "email": existing.email,
                "role": existing.role
            }
        else:
            # Create new admin user
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
            detail=f"Error ensuring admin user: {str(e)}",
        )

@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Change current user's password"""
    # Validate current password
    user = crud_user.authenticate_user(db, current_user.username, password_data.current_password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )
    
    # Validate new password strength
    from app.core.security import validate_password_strength
    is_valid, message = validate_password_strength(password_data.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=message)
    
    # Check if new password is same as current
    if password_data.current_password == password_data.new_password:
        raise HTTPException(
            status_code=400,
            detail="New password must be different from current password",
        )
    
    # Update password
    try:
        crud_user.update_user_password(db, user, password_data.new_password)
        return {"message": "Password changed successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error changing password: {str(e)}",
        )

@router.get("/health")
async def health_check(
    db: Session = Depends(deps.get_db),
) -> Any:
    """Health check endpoint that also ensures admin user exists"""
    try:
        # Check if admin user exists, create if not
        admin_user = crud_user.get_user_by_username(db, "admin")
        if not admin_user:
            # Create admin user
            user_data = {
                "email": "admin@lims.com",
                "username": "admin",
                "full_name": "Admin User",
                "role": "super_admin",
                "password": "Admin123!"
            }
            crud_user.create_user(db, user_data)
            admin_created = True
        else:
            admin_created = False
        
        return {
            "status": "healthy",
            "admin_user_exists": True,
            "admin_created": admin_created,
            "admin_username": "admin",
            "message": "LIMS system is running and admin access is guaranteed"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "admin_user_exists": False
        }

@router.post("/simple-login")
async def simple_login(
    login_data: SimpleLogin,
    db: Session = Depends(deps.get_db),
) -> Any:
    """Simple password-only authentication"""
    try:
        # Get the system password from database
        system_password = db.query(SystemPassword).first()
        
        if not system_password:
            # Create system password if it doesn't exist
            from app.core.security import get_password_hash
            hashed_password = get_password_hash("Admin123!")
            system_password = SystemPassword(password_hash=hashed_password)
            db.add(system_password)
            db.commit()
            db.refresh(system_password)
        
        # Verify password
        from app.core.security import verify_password
        if not verify_password(login_data.password, system_password.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password",
            )
        
        # Create a simple admin user for the session
        admin_user = crud_user.get_user_by_username(db, "admin")
        if not admin_user:
            # Create admin user if it doesn't exist
            user_data = {
                "email": "admin@lims.com",
                "username": "admin",
                "full_name": "Admin User",
                "role": "super_admin",
                "password": "Admin123!"
            }
            admin_user = crud_user.create_user(db, user_data)
        
        # Generate JWT token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = security.create_access_token(
            data={"sub": admin_user.username}, expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": admin_user.id,
                "email": admin_user.email,
                "username": admin_user.username,
                "full_name": admin_user.full_name,
                "role": admin_user.role
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login error: {str(e)}",
        )

