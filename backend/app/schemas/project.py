from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from app.models.project import ProjectStatus, ProjectType, TAT
from app.schemas.employee import Employee
from app.schemas.attachment import ProjectAttachment
from app.schemas.user import UserBasic

class ClientBase(BaseModel):
    name: str
    institution: Optional[str] = None
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    subscription_id: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class Client(ClientBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    project_type: ProjectType
    client_id: int
    tat: TAT
    start_date: datetime
    expected_sample_count: int
    processing_sample_count: Optional[int] = None
    project_value: Optional[float] = None
    notes: Optional[str] = None
    sales_rep_id: Optional[int] = None
    crm_link: Optional[str] = None

class ProjectCreate(ProjectBase):
    project_id: Optional[str] = None  # Allow user to provide project ID

class ProjectUpdate(BaseModel):
    project_type: Optional[ProjectType] = None
    client_id: Optional[int] = None
    status: Optional[ProjectStatus] = None
    tat: Optional[TAT] = None
    start_date: Optional[datetime] = None
    expected_sample_count: Optional[int] = None
    processing_sample_count: Optional[int] = None
    project_value: Optional[float] = None
    notes: Optional[str] = None
    sales_rep_id: Optional[int] = None
    crm_link: Optional[str] = None

class Project(ProjectBase):
    id: int
    project_id: str
    status: ProjectStatus
    due_date: datetime
    created_at: datetime
    updated_at: Optional[datetime] = None
    client: Optional[Client] = None
    sales_rep: Optional[Employee] = None
    attachments: List[ProjectAttachment] = []
    
    class Config:
        from_attributes = True

class ProjectLogBase(BaseModel):
    comment: str
    log_type: str = "comment"

class ProjectLogCreate(ProjectLogBase):
    project_id: int

class ProjectLog(ProjectLogBase):
    id: int
    project_id: int
    created_at: datetime
    created_by_id: Optional[int] = None
    created_by: Optional[UserBasic] = None
    
    class Config:
        from_attributes = True