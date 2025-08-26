from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import logging

from app.api import deps
from app.models.blocker import Blocker, Storage, Location, Function
from app.schemas.blocker import BlockerCreate, BlockerUpdate, Blocker as BlockerSchema, BlockerList

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/", response_model=List[BlockerList])
def get_blockers(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    storage: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
):
    """
    Retrieve blockers with optional filtering.
    """
    query = db.query(Blocker).options(joinedload(Blocker.created_by))
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(Blocker.name.ilike(search_term))
    
    if storage:
        query = query.filter(Blocker.storage == storage)
    
    if location:
        query = query.filter(Blocker.location == location)
    
    blockers = query.order_by(Blocker.created_at.desc()).offset(skip).limit(limit).all()
    
    # Convert blockers to dict format for response
    result = []
    for blocker in blockers:
        blocker_dict = {
            "id": blocker.id,
            "name": blocker.name,
            "units": blocker.units,
            "storage": blocker.storage,
            "location": blocker.location,
            "function": blocker.function,
            "notes": blocker.notes,
            "created_at": blocker.created_at,
            "created_by_id": blocker.created_by_id,
            "created_by": {
                "id": blocker.created_by.id,
                "full_name": blocker.created_by.full_name,
                "email": blocker.created_by.email
            } if blocker.created_by else None
        }
        result.append(blocker_dict)
    
    return result

@router.post("/", response_model=BlockerSchema)
def create_blocker(
    *,
    db: Session = Depends(deps.get_db),
    blocker_in: BlockerCreate,
):
    """
    Create new blocker.
    """
    logger.info(f"Creating new blocker: {blocker_in.name}")
    
    try:
        blocker = Blocker(
            **blocker_in.model_dump(),
            created_by_id=1  # Default admin user ID
        )
        db.add(blocker)
        db.commit()
        db.refresh(blocker)
        logger.info(f"Created blocker with ID: {blocker.id}")
        
        return blocker
    except Exception as e:
        logger.error(f"Error creating blocker: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create blocker: {str(e)}")

@router.get("/enums/storage")
def get_storage_options():
    """Get storage options for dropdown."""
    return [s.value for s in Storage]

@router.get("/enums/location")
def get_location_options():
    """Get location options for dropdown."""
    return [l.value for l in Location]

@router.get("/enums/function")
def get_function_options():
    """Get function options for dropdown."""
    return [f.value for f in Function]
