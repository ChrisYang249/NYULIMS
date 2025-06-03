from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime
from app.models.extraction_plate import PlateStatus

class ExtractionPlateBase(BaseModel):
    plate_name: Optional[str] = None
    extraction_method: Optional[str] = None
    lysis_method: Optional[str] = None
    extraction_lot: Optional[str] = None
    notes: Optional[str] = None

class ExtractionPlateCreate(ExtractionPlateBase):
    assigned_tech_id: Optional[int] = None

class ExtractionPlateUpdate(ExtractionPlateBase):
    status: Optional[PlateStatus] = None
    assigned_tech_id: Optional[int] = None

class ExtractionPlate(ExtractionPlateBase):
    id: int
    plate_id: str
    status: PlateStatus
    total_wells: int
    sample_wells: int
    assigned_tech_id: Optional[int] = None
    assigned_date: Optional[datetime] = None
    started_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    ext_pos_ctrl_id: Optional[str] = None
    ext_neg_ctrl_id: Optional[str] = None
    ext_pos_ctrl_pass: Optional[bool] = None
    ext_neg_ctrl_pass: Optional[bool] = None
    ext_pos_ctrl_concentration: Optional[float] = None
    ext_neg_ctrl_concentration: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Relationships
    assigned_tech: Optional[Dict[str, Any]] = None
    sample_count: Optional[int] = None
    
    class Config:
        from_attributes = True
        
    @classmethod
    def from_orm(cls, obj):
        # Handle the assigned_tech relationship
        data = obj.__dict__.copy()
        if hasattr(obj, 'assigned_tech') and obj.assigned_tech:
            data['assigned_tech'] = {
                'id': obj.assigned_tech.id,
                'username': obj.assigned_tech.username,
                'full_name': obj.assigned_tech.full_name,
                'role': obj.assigned_tech.role
            }
        if hasattr(obj, 'samples'):
            data['sample_count'] = len(obj.samples)
        return cls(**data)

class PlateWellAssignment(BaseModel):
    id: int
    plate_id: int
    sample_id: Optional[int] = None
    well_position: str
    well_row: str
    well_column: int
    is_control: bool
    control_type: Optional[str] = None
    
    # From relationships
    sample: Optional[dict] = None
    
    class Config:
        from_attributes = True
        
    @classmethod
    def from_orm(cls, obj):
        # Handle the sample relationship
        data = obj.__dict__.copy()
        if hasattr(obj, 'sample') and obj.sample:
            data['sample'] = {
                'id': obj.sample.id,
                'barcode': obj.sample.barcode,
                'client_sample_id': obj.sample.client_sample_id,
                'project': {
                    'project_id': obj.sample.project.project_id
                } if obj.sample.project else None
            }
        else:
            data['sample'] = None
        return cls(**data)

class PlateAssignment(BaseModel):
    """For assigning samples to a plate"""
    sample_ids: List[int]
    tech_id: int
    extraction_method: str
    notes: Optional[str] = None

class PlateAutoAssignRequest(BaseModel):
    """Request for auto-assigning samples to plate"""
    max_samples: Optional[int] = 92
    min_samples: Optional[int] = 1
    project_ids: Optional[List[int]] = None
    sample_types: Optional[List[str]] = None
    prioritize_by_due_date: bool = True
    group_by_project: bool = True

class PlateAutoAssignResponse(BaseModel):
    """Response after auto-assigning samples"""
    plate_id: str
    total_samples: int
    assigned_samples: List[dict]
    project_summary: Dict[str, int]
    control_wells: dict