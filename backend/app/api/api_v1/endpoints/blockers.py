from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
import logging
import json

from app import crud, models, schemas
from app.api import deps
from app.models import Blocker, BlockerLog, User

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/", response_model=List[schemas.BlockerList])
def get_blockers(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None, description="Search by blocker name"),
    storage: Optional[str] = Query(None, description="Filter by storage"),
    location: Optional[str] = Query(None, description="Filter by location"),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve blockers with optional filtering.
    """
    query = db.query(Blocker)
    
    if search:
        query = query.filter(Blocker.name.ilike(f"%{search}%"))
    
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
            "updated_at": blocker.updated_at,
            "created_by_id": blocker.created_by_id,
            "created_by": {
                "id": blocker.created_by.id,
                "full_name": blocker.created_by.full_name,
                "email": blocker.created_by.email
            } if blocker.created_by else None
        }
        result.append(blocker_dict)
    
    return result

@router.get("/{blocker_id}", response_model=schemas.Blocker)
def get_blocker(
    *,
    db: Session = Depends(deps.get_db),
    blocker_id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get blocker by ID.
    """
    blocker = db.query(Blocker).filter(Blocker.id == blocker_id).first()
    if not blocker:
        raise HTTPException(status_code=404, detail="Blocker not found")
    
    # Convert to dict format for response
    blocker_dict = {
        "id": blocker.id,
        "name": blocker.name,
        "units": blocker.units,
        "storage": blocker.storage,
        "location": blocker.location,
        "function": blocker.function,
        "notes": blocker.notes,
        "created_at": blocker.created_at,
        "updated_at": blocker.updated_at,
        "created_by_id": blocker.created_by_id,
        "created_by": {
            "id": blocker.created_by.id,
            "full_name": blocker.created_by.full_name,
            "email": blocker.created_by.email
        } if blocker.created_by else None
    }
    return blocker_dict

@router.post("/", response_model=schemas.Blocker)
def create_blocker(
    *,
    db: Session = Depends(deps.get_db),
    blocker_in: schemas.BlockerCreate,
    current_user: User = Depends(deps.get_current_user),
):
    """
    Create new blocker.
    """
    logger.info(f"Creating new blocker by user {current_user.id}: {blocker_in.name}")
    
    try:
        blocker = Blocker(
            **blocker_in.model_dump(),
            created_by_id=current_user.id
        )
        db.add(blocker)
        db.commit()
        db.refresh(blocker)
        logger.info(f"Created blocker with ID: {blocker.id}")
        
        # Log the creation
        blocker_data = blocker_in.model_dump()
        
        blocker_log = BlockerLog(
            blocker_id=blocker.id,
            log_type="creation",
            new_value=json.dumps(blocker_data),
            comment=f"Blocker created by {current_user.full_name}",
            created_by_id=current_user.id
        )
        db.add(blocker_log)
        db.commit()
        logger.info(f"Created creation log for blocker {blocker.id}")
        
        # Convert blocker to dict format for response
        blocker_dict = {
            "id": blocker.id,
            "name": blocker.name,
            "units": blocker.units,
            "storage": blocker.storage,
            "location": blocker.location,
            "function": blocker.function,
            "notes": blocker.notes,
            "created_at": blocker.created_at,
            "updated_at": blocker.updated_at,
            "created_by_id": blocker.created_by_id,
            "created_by": {
                "id": current_user.id,
                "full_name": current_user.full_name,
                "email": current_user.email
            }
        }
        return blocker_dict
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating blocker: {e}")
        raise HTTPException(status_code=500, detail="Failed to create blocker")

@router.put("/{blocker_id}", response_model=schemas.Blocker)
def update_blocker(
    *,
    db: Session = Depends(deps.get_db),
    blocker_id: int,
    blocker_in: schemas.BlockerUpdate,
    current_user: User = Depends(deps.get_current_user),
):
    """
    Update blocker.
    """
    blocker = db.query(Blocker).filter(Blocker.id == blocker_id).first()
    if not blocker:
        raise HTTPException(status_code=404, detail="Blocker not found")
    
    # Store old values for logging
    old_values = {
        "name": blocker.name,
        "units": blocker.units,
        "storage": blocker.storage,
        "location": blocker.location,
        "function": blocker.function,
        "notes": blocker.notes,
    }
    
    update_data = blocker_in.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(blocker, field, value)
    
    db.add(blocker)
    db.commit()
    db.refresh(blocker)
    
    # Log the update
    blocker_log = BlockerLog(
        blocker_id=blocker.id,
        log_type="update",
        old_value=json.dumps(old_values),
        new_value=json.dumps(update_data),
        comment=f"Blocker updated by {current_user.full_name}",
        created_by_id=current_user.id
    )
    db.add(blocker_log)
    db.commit()
    
    # Convert blocker to dict format for response
    blocker_dict = {
        "id": blocker.id,
        "name": blocker.name,
        "units": blocker.units,
        "storage": blocker.storage,
        "location": blocker.location,
        "function": blocker.function,
        "notes": blocker.notes,
        "created_at": blocker.created_at,
        "updated_at": blocker.updated_at,
        "created_by_id": blocker.created_by_id,
        "created_by": {
            "id": current_user.id,
            "full_name": current_user.full_name,
            "email": current_user.email
        }
    }
    return blocker_dict

@router.delete("/{blocker_id}")
def delete_blocker(
    *,
    db: Session = Depends(deps.get_db),
    blocker_id: int,
    current_user: User = Depends(deps.get_current_user),
):
    """
    Delete blocker.
    """
    logger.info(f"Attempting to delete blocker {blocker_id} by user {current_user.id}")
    
    blocker = db.query(Blocker).filter(Blocker.id == blocker_id).first()
    if not blocker:
        logger.warning(f"Blocker {blocker_id} not found")
        raise HTTPException(status_code=404, detail="Blocker not found")
    
    try:
        # Log the deletion
        blocker_log = BlockerLog(
            blocker_id=blocker_id,
            log_type="deletion",
            old_value=json.dumps({
                "name": blocker.name,
                "units": blocker.units,
                "storage": blocker.storage,
                "location": blocker.location,
                "function": blocker.function,
                "notes": blocker.notes,
            }),
            comment=f"Blocker deleted by {current_user.full_name}",
            created_by_id=current_user.id
        )
        db.add(blocker_log)
        db.commit()
        
        # Delete all associated logs first
        db.query(BlockerLog).filter(BlockerLog.blocker_id == blocker_id).delete()
        db.commit()
        
        # Delete the blocker
        db.delete(blocker)
        db.commit()
        
        logger.info(f"Successfully deleted blocker {blocker_id}")
        return {"message": "Blocker deleted successfully"}
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting blocker {blocker_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete blocker")

@router.get("/enums/storage")
def get_storage_options():
    """
    Get storage options for dropdown.
    """
    return [
        {"value": "RT", "label": "RT"},
        {"value": "4°C", "label": "4°C"},
        {"value": "-20°C", "label": "-20°C"},
        {"value": "RT & LS", "label": "RT & LS"},
        {"value": "4°C & LS", "label": "4°C & LS"},
    ]

@router.get("/enums/location")
def get_location_options():
    """
    Get location options for dropdown.
    """
    return [
        {"value": "Above PFA Bench", "label": "Above PFA Bench"},
        {"value": "Above Ephys Bench", "label": "Above Ephys Bench"},
        {"value": "4C Fridge - Wet lab", "label": "4C Fridge - Wet lab"},
        {"value": "4°C Fridge - Wet lab", "label": "4°C Fridge - Wet lab"},
        {"value": "-20°C Fridge - Wet Lab", "label": "-20°C Fridge - Wet Lab"},
    ]

@router.get("/enums/function")
def get_function_options():
    """
    Get function options for dropdown.
    """
    return [
        {"value": "Calcium Channel Blocker", "label": "Calcium Channel Blocker"},
        {"value": "GABA A Receptor/Chloride Channel Blocker", "label": "GABA A Receptor/Chloride Channel Blocker"},
        {"value": "Inward Rectifier Potassium Channel Blocker", "label": "Inward Rectifier Potassium Channel Blocker"},
        {"value": "Potassium Channel Blocker", "label": "Potassium Channel Blocker"},
        {"value": "A1 A2a Adenosine Receptor Blocker", "label": "A1 A2a Adenosine Receptor Blocker"},
        {"value": "Glutamate at Ionotropic Receptor Blocker", "label": "Glutamate at Ionotropic Receptor Blocker"},
        {"value": "Sodium Channel Blocker", "label": "Sodium Channel Blocker"},
        {"value": "Selective NMDA Receptor Blocker", "label": "Selective NMDA Receptor Blocker"},
        {"value": "Competitive GABAA Receptor Blocker", "label": "Competitive GABAA Receptor Blocker"},
        {"value": "Selective Potassium Channel Blocker", "label": "Selective Potassium Channel Blocker"},
        {"value": "HCN Channel Blocker (prevents hyperpolarization)", "label": "HCN Channel Blocker (prevents hyperpolarization)"},
        {"value": "Calcium Activated Potassium Channel Blocker", "label": "Calcium Activated Potassium Channel Blocker"},
    ]

@router.get("/{blocker_id}/logs")
def get_blocker_logs(
    *,
    db: Session = Depends(deps.get_db),
    blocker_id: int,
    current_user: User = Depends(deps.get_current_user),
):
    """
    Get logs for a specific blocker.
    """
    logs = db.query(BlockerLog).filter(BlockerLog.blocker_id == blocker_id).order_by(BlockerLog.created_at.desc()).all()
    
    result = []
    for log in logs:
        log_dict = {
            "id": log.id,
            "blocker_id": log.blocker_id,
            "log_type": log.log_type,
            "old_value": log.old_value,
            "new_value": log.new_value,
            "comment": log.comment,
            "created_at": log.created_at,
            "created_by_id": log.created_by_id,
            "created_by": {
                "id": log.created_by.id,
                "full_name": log.created_by.full_name,
                "email": log.created_by.email
            } if log.created_by else None
        }
        result.append(log_dict)
    
    return result
