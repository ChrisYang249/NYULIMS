from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class DeletionLog(BaseModel):
    id: int
    entity_type: str  # 'sample' or 'project'
    entity_id: int
    entity_identifier: str  # barcode for samples, project_id for projects
    deletion_reason: str
    deleted_by: str  # User full name
    deleted_by_id: int
    deleted_at: datetime
    previous_status: str
    
    class Config:
        from_attributes = True