from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from app.models.sample import SampleType, SampleStatus

class SampleBase(BaseModel):
    client_sample_id: Optional[str] = None
    project_id: int
    sample_type: SampleType
    parent_sample_id: Optional[int] = None
    reprocess_type: Optional[str] = None
    reprocess_reason: Optional[str] = None

class SampleCreate(SampleBase):
    pass

class Sample(SampleBase):
    id: int
    barcode: str
    status: SampleStatus
    created_at: datetime
    received_date: Optional[datetime] = None
    accessioned_date: Optional[datetime] = None
    
    class Config:
        from_attributes = True