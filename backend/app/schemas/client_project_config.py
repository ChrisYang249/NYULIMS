from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ClientProjectConfigBase(BaseModel):
    naming_scheme: str
    prefix: str
    include_sample_types: bool = True

class ClientProjectConfigCreate(ClientProjectConfigBase):
    client_id: int

class ClientProjectConfigUpdate(ClientProjectConfigBase):
    naming_scheme: Optional[str] = None
    prefix: Optional[str] = None
    include_sample_types: Optional[bool] = None

class ClientProjectConfigInDB(ClientProjectConfigBase):
    id: int
    client_id: int
    last_batch_number: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ClientProjectConfig(ClientProjectConfigInDB):
    pass

class GenerateProjectIdRequest(BaseModel):
    client_id: int
    stool_count: Optional[int] = 0
    vaginal_count: Optional[int] = 0
    other_count: Optional[int] = 0
    custom_suffix: Optional[str] = None

class GenerateProjectIdResponse(BaseModel):
    project_id: str
    batch_number: int