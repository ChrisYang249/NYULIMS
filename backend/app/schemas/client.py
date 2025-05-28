from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime


class ClientBase(BaseModel):
    name: str
    institution: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    subscription_id: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(ClientBase):
    name: Optional[str] = None
    email: Optional[EmailStr] = None


class ClientInDBBase(ClientBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Client(ClientInDBBase):
    pass