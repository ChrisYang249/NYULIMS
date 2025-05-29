from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.models.sample_type import SampleType as SampleTypeModel
from app.schemas.sample_type import SampleType as SampleTypeSchema, SampleTypeCreate, SampleTypeUpdate
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[SampleTypeSchema])
def get_sample_types(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True
) -> Any:
    """Get all sample types"""
    query = db.query(SampleTypeModel)
    
    if active_only:
        query = query.filter(SampleTypeModel.is_active == True)
    
    sample_types = query.order_by(SampleTypeModel.sort_order, SampleTypeModel.display_name).offset(skip).limit(limit).all()
    return sample_types

@router.get("/{sample_type_id}", response_model=SampleTypeSchema)
def get_sample_type(
    sample_type_id: int,
    db: Session = Depends(deps.get_db)
) -> Any:
    """Get sample type by ID"""
    sample_type = db.query(SampleTypeModel).filter(SampleTypeModel.id == sample_type_id).first()
    if not sample_type:
        raise HTTPException(status_code=404, detail="Sample type not found")
    return sample_type

@router.post("/", response_model=SampleTypeSchema)
def create_sample_type(
    sample_type_in: SampleTypeCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Create new sample type (admin only)"""
    # Check permissions
    from app.api.permissions import check_permission
    check_permission(current_user, "createSampleTypes")
    
    # Check if name already exists
    existing = db.query(SampleTypeModel).filter(SampleTypeModel.name == sample_type_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Sample type with this name already exists")
    
    sample_type = SampleTypeModel(**sample_type_in.dict())
    db.add(sample_type)
    db.commit()
    db.refresh(sample_type)
    return sample_type

@router.put("/{sample_type_id}", response_model=SampleTypeSchema)
def update_sample_type(
    sample_type_id: int,
    sample_type_in: SampleTypeUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Update sample type (admin only)"""
    # Check permissions
    from app.api.permissions import check_permission
    check_permission(current_user, "editSampleTypes")
    
    sample_type = db.query(SampleTypeModel).filter(SampleTypeModel.id == sample_type_id).first()
    if not sample_type:
        raise HTTPException(status_code=404, detail="Sample type not found")
    
    update_data = sample_type_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(sample_type, field, value)
    
    db.commit()
    db.refresh(sample_type)
    return sample_type