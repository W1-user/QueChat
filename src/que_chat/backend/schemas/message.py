from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class MessageBase(BaseModel):
    username: Optional[str]
    text: Optional[str]


class MessageCreate(MessageBase):
    text: Optional[str] = Field(max_length=2000)


class Message(MessageCreate):
    id: Optional[int]
    timestamp: Optional[datetime]

    class Config:
        from_attributes = True
