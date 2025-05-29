from typing import Optional, List
from pydantic import BaseModel, validator
from datetime import datetime
from app.models.sample import SampleType, SampleStatus

class SampleBase(BaseModel):
    client_sample_id: Optional[str] = None
    project_id: int
    sample_type: SampleType
    parent_sample_id: Optional[int] = None
    reprocess_type: Optional[str] = None
    reprocess_reason: Optional[str] = None
    storage_location_id: Optional[int] = None
    target_depth: Optional[float] = None
    well_location: Optional[str] = None
    due_date: Optional[datetime] = None
    
    @validator('well_location')
    def validate_well_location(cls, v, values):
        if values.get('sample_type') == SampleType.DNA_PLATE and not v:
            raise ValueError('Well location is required for DNA plate samples')
        return v

class SampleCreate(SampleBase):
    pass

class SampleBulkCreate(BaseModel):
    count: int  # Number of samples to create
    project_id: int
    sample_type: SampleType
    samples: List[dict]  # List of sample-specific data
    
class SampleUpdate(BaseModel):
    client_sample_id: Optional[str] = None
    sample_type: Optional[SampleType] = None
    storage_location_id: Optional[int] = None
    target_depth: Optional[float] = None
    well_location: Optional[str] = None
    status: Optional[SampleStatus] = None
    storage_unit: Optional[str] = None
    storage_shelf: Optional[str] = None
    storage_box: Optional[str] = None
    storage_position: Optional[str] = None
    
class SampleAccession(BaseModel):
    accessioning_notes: Optional[str] = None

class StorageLocationBase(BaseModel):
    freezer: str
    shelf: str
    box: str
    position: Optional[str] = None
    notes: Optional[str] = None

class StorageLocationCreate(StorageLocationBase):
    pass

class StorageLocation(StorageLocationBase):
    id: int
    is_available: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class Sample(SampleBase):
    id: int
    barcode: str
    status: SampleStatus
    created_at: datetime
    received_date: Optional[datetime] = None
    accessioned_date: Optional[datetime] = None
    storage_location: Optional[StorageLocation] = None
    
    # Storage fields (for backwards compatibility)
    storage_unit: Optional[str] = None
    storage_shelf: Optional[str] = None
    storage_box: Optional[str] = None
    storage_position: Optional[str] = None
    
    class Config:
        from_attributes = True

# Enhanced sample response with lab data
class SampleWithLabData(Sample):
    # From related tables
    extraction_kit: Optional[str] = None
    extraction_lot: Optional[str] = None
    dna_concentration_ng_ul: Optional[float] = None
    library_prep_kit: Optional[str] = None
    library_prep_lot: Optional[str] = None
    library_concentration_ng_ul: Optional[float] = None
    sequencing_run_id: Optional[str] = None
    sequencing_instrument: Optional[str] = None
    achieved_depth: Optional[float] = None
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    client_institution: Optional[str] = None
    
    class Config:
        from_attributes = True