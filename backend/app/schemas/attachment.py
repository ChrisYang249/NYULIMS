from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class ProjectAttachmentBase(BaseModel):
    filename: str
    original_filename: str
    file_size: Optional[int] = None
    file_type: Optional[str] = None

class ProjectAttachmentCreate(ProjectAttachmentBase):
    project_id: int
    file_path: str

class ProjectAttachment(ProjectAttachmentBase):
    id: int
    project_id: int
    created_at: datetime
    uploaded_by_id: Optional[int] = None
    
    class Config:
        from_attributes = True