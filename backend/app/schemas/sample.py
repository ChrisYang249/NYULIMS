from typing import Optional, List
from pydantic import BaseModel, validator
from datetime import datetime
from app.models.sample import SampleType, SampleStatus

class SampleBase(BaseModel):
    client_sample_id: Optional[str] = None
    project_id: int
    sample_type: Optional[SampleType] = None  # For backward compatibility
    sample_type_id: Optional[int] = None  # New field
    sample_type_other: Optional[str] = None
    parent_sample_id: Optional[int] = None
    reprocess_type: Optional[str] = None
    reprocess_reason: Optional[str] = None
    storage_location_id: Optional[int] = None
    target_depth: Optional[float] = None
    well_location: Optional[str] = None
    due_date: Optional[datetime] = None
    pretreatment_type: Optional[str] = None
    spike_in_type: Optional[str] = None
    has_flag: Optional[bool] = False
    flag_abbreviation: Optional[str] = None
    flag_notes: Optional[str] = None
    
    @validator('well_location')
    def validate_well_location(cls, v, values):
        if values.get('sample_type') == SampleType.DNA_PLATE and not v:
            raise ValueError('Well location is required for DNA plate samples')
        return v
    
    @validator('sample_type_other')
    def validate_sample_type_other(cls, v, values):
        # Will need to check if sample_type_id references "other" type
        # For now, keep backward compatibility
        if values.get('sample_type') == SampleType.OTHER and not v:
            raise ValueError('Description is required when sample type is Other')
        return v

class SampleCreate(SampleBase):
    sample_type_id: int  # Required for new samples

class SampleBulkCreate(BaseModel):
    count: int  # Number of samples to create
    project_id: int
    sample_type: Optional[SampleType] = None  # For backward compatibility
    sample_type_id: Optional[int] = None  # New field
    samples: List[dict]  # List of sample-specific data

class SampleImportData(BaseModel):
    """Schema for individual sample import data"""
    project_id: str  # Project ID string (e.g., CMBP00001)
    client_sample_id: Optional[str] = None
    sample_type: str  # Sample type name (e.g., stool, dna_plate)
    service_type: Optional[str] = None  # Service type (e.g., WGS, 16S-V1V3, etc.)
    target_depth: Optional[float] = None
    well_location: Optional[str] = None
    storage_freezer: Optional[str] = None
    storage_shelf: Optional[str] = None
    storage_box: Optional[str] = None
    storage_position: Optional[str] = None

class SampleBulkImport(BaseModel):
    """Schema for bulk import from CSV/Excel files"""
    samples: List[SampleImportData]
    
class SampleUpdate(BaseModel):
    client_sample_id: Optional[str] = None
    sample_type: Optional[SampleType] = None
    sample_type_other: Optional[str] = None
    storage_location_id: Optional[int] = None
    target_depth: Optional[float] = None
    well_location: Optional[str] = None
    status: Optional[SampleStatus] = None
    storage_unit: Optional[str] = None
    storage_shelf: Optional[str] = None
    storage_box: Optional[str] = None
    storage_position: Optional[str] = None
    queue_priority: Optional[int] = None
    queue_notes: Optional[str] = None
    batch_id: Optional[str] = None
    pretreatment_type: Optional[str] = None
    spike_in_type: Optional[str] = None
    has_flag: Optional[bool] = None
    flag_abbreviation: Optional[str] = None
    flag_notes: Optional[str] = None
    has_discrepancy: Optional[bool] = None
    discrepancy_notes: Optional[str] = None
    # Extraction workflow fields
    extraction_plate_id: Optional[str] = None
    extraction_tech_id: Optional[int] = None
    extraction_assigned_date: Optional[datetime] = None
    extraction_started_date: Optional[datetime] = None
    extraction_completed_date: Optional[datetime] = None
    extraction_method: Optional[str] = None
    extraction_notes: Optional[str] = None
    extraction_well_position: Optional[str] = None
    extraction_qc_pass: Optional[bool] = None
    extraction_concentration: Optional[float] = None
    extraction_volume: Optional[float] = None
    extraction_260_280: Optional[float] = None
    extraction_260_230: Optional[float] = None
    
    @validator('status', pre=True)
    def validate_status(cls, v):
        if isinstance(v, str):
            # Ensure the status value matches the enum values exactly
            if v == 'extraction_queue' or v == 'EXTRACTION_QUEUE':
                return 'extraction_queue'
            elif v == 'dna_quant_queue' or v == 'DNA_QUANT_QUEUE':
                return 'dna_quant_queue'
        return v
    
    class Config:
        use_enum_values = True
    
class SampleAccession(BaseModel):
    accessioning_notes: Optional[str] = None

class SampleFailure(BaseModel):
    failed_stage: str  # "extraction", "library_prep", "sequencing"
    failure_reason: str
    create_reprocess: bool = True  # Whether to create a reprocess sample

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
    sample_type_other: Optional[str] = None
    
    # Storage fields (for backwards compatibility)
    storage_unit: Optional[str] = None
    storage_shelf: Optional[str] = None
    storage_box: Optional[str] = None
    storage_position: Optional[str] = None
    
    # Queue management fields
    queue_priority: Optional[int] = None
    queue_notes: Optional[str] = None
    failed_stage: Optional[str] = None
    failure_reason: Optional[str] = None
    reprocess_count: Optional[int] = None
    batch_id: Optional[str] = None
    extraction_due_date: Optional[datetime] = None
    library_prep_due_date: Optional[datetime] = None
    sequencing_due_date: Optional[datetime] = None
    
    # New enhancement fields
    pretreatment_date: Optional[datetime] = None
    has_discrepancy: Optional[bool] = None
    discrepancy_notes: Optional[str] = None
    discrepancy_resolved: Optional[bool] = None
    discrepancy_resolution_date: Optional[datetime] = None
    
    # Extraction workflow fields
    extraction_plate_id: Optional[str] = None
    extraction_tech_id: Optional[int] = None
    extraction_assigned_date: Optional[datetime] = None
    extraction_started_date: Optional[datetime] = None
    extraction_completed_date: Optional[datetime] = None
    extraction_method: Optional[str] = None
    extraction_notes: Optional[str] = None
    extraction_well_position: Optional[str] = None
    extraction_qc_pass: Optional[bool] = None
    extraction_concentration: Optional[float] = None
    extraction_volume: Optional[float] = None
    extraction_260_280: Optional[float] = None
    extraction_260_230: Optional[float] = None
    
    class Config:
        from_attributes = True
        use_enum_values = True

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
    service_type: Optional[str] = None
    has_discrepancy: Optional[bool] = False
    discrepancy_resolved: Optional[bool] = False
    # Add extraction plate reference ID for frontend to fetch details
    extraction_plate_ref_id: Optional[int] = None
    
    class Config:
        from_attributes = True

# Sample Log Schemas
class SampleLogBase(BaseModel):
    comment: str
    log_type: str = "comment"
    old_value: Optional[str] = None
    new_value: Optional[str] = None

class SampleLogCreate(SampleLogBase):
    sample_id: int

class SampleLog(SampleLogBase):
    id: int
    sample_id: int
    created_at: datetime
    created_by_id: Optional[int] = None
    created_by: Optional[dict] = None  # Will include user info
    
    class Config:
        from_attributes = True

# Discrepancy Attachment Schemas
class DiscrepancyAttachmentBase(BaseModel):
    original_filename: str
    file_size: Optional[int] = None
    file_type: Optional[str] = None

class DiscrepancyAttachmentCreate(DiscrepancyAttachmentBase):
    filename: str
    file_path: str
    
class DiscrepancyAttachment(DiscrepancyAttachmentBase):
    id: int
    discrepancy_approval_id: int
    filename: str
    uploaded_by_id: Optional[int] = None
    created_at: datetime
    uploaded_by: Optional[dict] = None
    
    class Config:
        from_attributes = True

# Discrepancy Approval Schemas
class DiscrepancyApprovalBase(BaseModel):
    discrepancy_type: str
    discrepancy_details: str
    approval_reason: Optional[str] = None

class DiscrepancyApprovalCreate(DiscrepancyApprovalBase):
    pass

class DiscrepancyApprovalUpdate(BaseModel):
    approved: bool
    approval_reason: str
    signature_meaning: str
    password: Optional[str] = None
    
class DiscrepancyApprovalResponse(DiscrepancyApprovalBase):
    id: int
    sample_id: int
    approved: Optional[bool] = None  # None = pending, True = approved, False = rejected
    approved_by_id: Optional[int] = None
    approval_date: Optional[datetime] = None
    signature_meaning: Optional[str] = None
    created_at: datetime
    approved_by: Optional[dict] = None  # Will include user info
    created_by: Optional[dict] = None  # Will include user info
    attachments: Optional[List['DiscrepancyAttachment']] = []
    
    class Config:
        from_attributes = True

__all__ = [
    "SampleBase",
    "SampleCreate",
    "SampleUpdate",
    "SampleBulkCreate",
    "SampleBulkImport",
    "SampleImportData",
    "SampleAccession",
    "SampleFailure",
    "Sample",
    "SampleInDB",
    "SampleWithLabData",
    "ExtractionResultBase",
    "ExtractionResultCreate",
    "ExtractionResult",
    "LibraryPrepResultBase",
    "LibraryPrepResultCreate",
    "LibraryPrepResult",
    "StorageLocationBase",
    "StorageLocationCreate",
    "StorageLocation",
    "SampleLogBase",
    "SampleLogCreate",
    "SampleLog",
    "DiscrepancyApprovalBase",
    "DiscrepancyApprovalCreate",
    "DiscrepancyApprovalUpdate",
    "DiscrepancyApprovalResponse"
]