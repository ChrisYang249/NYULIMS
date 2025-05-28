from typing import Optional
from pydantic import BaseModel

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Optional[dict] = None

class TokenPayload(BaseModel):
    sub: Optional[str] = None