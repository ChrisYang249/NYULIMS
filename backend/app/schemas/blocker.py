from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class BlockerBase(BaseModel):
    name: str = Field(..., description="Blocker name")
    units: Optional[int] = Field(None, description="Number of units")
    storage: Optional[str] = Field(None, description="Storage conditions")
    location: Optional[str] = Field(None, description="Storage location")
    function: Optional[str] = Field(None, description="Blocker function")
    notes: Optional[str] = Field(None, description="Additional notes")


class BlockerCreate(BlockerBase):
    pass


class BlockerUpdate(BaseModel):
    name: Optional[str] = None
    units: Optional[int] = None
    storage: Optional[str] = None
    location: Optional[str] = None
    function: Optional[str] = None
    notes: Optional[str] = None


class Blocker(BlockerBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by_id: Optional[int] = None
    created_by: Optional[dict] = None

    class Config:
        from_attributes = True


class BlockerList(BaseModel):
    id: int
    name: str
    units: Optional[int] = None
    storage: Optional[str] = None
    location: Optional[str] = None
    function: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by_id: Optional[int] = None
    created_by: Optional[dict] = None

    class Config:
        from_attributes = True


class BlockerLog(BaseModel):
    id: int
    blocker_id: Optional[int] = None
    log_type: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    comment: Optional[str] = None
    created_at: datetime
    created_by_id: Optional[int] = None
    created_by: Optional[dict] = None

    class Config:
        from_attributes = True
