from typing import Optional
from pydantic import BaseModel
from datetime import datetime, date

class ControlSampleBase(BaseModel):
    control_type: str  # "positive" or "negative" 
    control_category: str  # "extraction" or "library_prep"
    set_number: int = 1
    well_position: str
    lot_number: Optional[str] = None
    expiration_date: Optional[date] = None
    supplier: Optional[str] = None
    product_name: Optional[str] = None
    input_volume: float = 250.0
    elution_volume: float = 100.0
    notes: Optional[str] = None

class ControlSampleCreate(ControlSampleBase):
    plate_id: int

class ControlSampleUpdate(BaseModel):
    control_type: Optional[str] = None
    control_category: Optional[str] = None
    set_number: Optional[int] = None
    well_position: Optional[str] = None
    lot_number: Optional[str] = None
    expiration_date: Optional[date] = None
    supplier: Optional[str] = None
    product_name: Optional[str] = None
    input_volume: Optional[float] = None
    elution_volume: Optional[float] = None
    concentration: Optional[float] = None
    ratio_260_280: Optional[float] = None
    ratio_260_230: Optional[float] = None
    qc_pass: Optional[bool] = None
    qc_notes: Optional[str] = None
    notes: Optional[str] = None

class ControlSample(ControlSampleBase):
    id: int
    control_id: str
    plate_id: int
    well_row: Optional[str] = None
    well_column: Optional[int] = None
    concentration: Optional[float] = None
    ratio_260_280: Optional[float] = None
    ratio_260_230: Optional[float] = None
    qc_pass: Optional[bool] = None
    qc_notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ControlSetRequest(BaseModel):
    """Request to add a set of controls to a plate"""
    control_category: str  # "extraction" or "library_prep"
    positions: list[str]  # Well positions like ["E12", "F12"]
    lot_number: Optional[str] = None
    expiration_date: Optional[date] = None
    supplier: Optional[str] = None
    product_name: Optional[str] = None
    input_volume: float = 250.0
    elution_volume: float = 100.0
    notes: Optional[str] = None

class PlateLayoutWell(BaseModel):
    """Represents a single well in the plate layout"""
    position: str  # "A1", "B2", etc.
    row: str  # "A", "B", etc.
    column: int  # 1, 2, etc.
    content_type: str  # "sample", "control", "empty"
    
    # For samples
    sample_id: Optional[int] = None
    sample_barcode: Optional[str] = None
    sample_type: Optional[str] = None
    client_sample_id: Optional[str] = None
    project_code: Optional[str] = None
    
    # For controls
    control_id: Optional[str] = None
    control_type: Optional[str] = None  # "positive", "negative"
    control_category: Optional[str] = None  # "extraction", "library_prep"
    
    class Config:
        from_attributes = True

class PlateLayoutResponse(BaseModel):
    """Complete plate layout with all wells"""
    plate_id: str
    plate_name: Optional[str] = None
    status: str
    total_wells: int = 96
    wells: list[PlateLayoutWell]
    sample_count: int
    control_count: int
    empty_count: int