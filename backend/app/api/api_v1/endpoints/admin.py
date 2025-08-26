from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Any

from app.api import deps
from app.crud import user as crud_user
from app.schemas.user import UserCreate, User

router = APIRouter()

@router.post("/create-initial-admin", response_model=User)
def create_initial_admin(
    *,
    db: Session = Depends(deps.get_db),
) -> Any:
    """Create initial admin user (only works if no users exist)"""
    
    # Check if any users exist
    existing_users = crud_user.get_users(db, skip=0, limit=1)
    if existing_users:
        raise HTTPException(
            status_code=400,
            detail="Users already exist. Cannot create initial admin."
        )
    
    # Create admin user data
    admin_data = UserCreate(
        email="admin@lims.com",
        username="admin",
        full_name="Admin User",
        role="super_admin",
        password="Admin123!"
    )
    
    # Create the user
    user = crud_user.create_user(db, admin_data.dict())
    
    return user
