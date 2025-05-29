from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class SampleTypeBase(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None
    requires_description: bool = False
    is_active: bool = True
    sort_order: int = 0

class SampleTypeCreate(SampleTypeBase):
    pass

class SampleTypeUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    requires_description: Optional[bool] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None

class SampleType(SampleTypeBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True