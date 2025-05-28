from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from app.models.project import ProjectStatus, TAT

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
    name: str
    client_id: int
    tat: TAT
    expected_sample_count: int
    project_value: Optional[float] = None
    notes: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class Project(ProjectBase):
    id: int
    project_id: str
    status: ProjectStatus
    received_date: datetime
    due_date: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True