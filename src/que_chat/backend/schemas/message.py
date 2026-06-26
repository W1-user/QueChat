from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class MessageBase(BaseModel):
    username: str
    text: str


class MessageCreate(MessageBase):
    timestamp: Optional[datetime] = None


class Message(MessageCreate):
    id: int
    timestamp: Optional[datetime] = None
    is_deleted: bool = False

    class Config:
        from_attributes = True
