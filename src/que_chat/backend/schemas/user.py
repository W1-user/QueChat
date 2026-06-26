from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional

class ProfileBase(BaseModel):
    id: int
    username: Optional[str] = Field(min_length=3, max_length=15)
    timestamp: Optional[datetime] = None

    class Config:
        from_attributes = True