from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime

class EmployeeBase(BaseModel):
    name: str
    email: EmailStr
    title: str
    department: str

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    title: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None

class Employee(EmployeeBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True