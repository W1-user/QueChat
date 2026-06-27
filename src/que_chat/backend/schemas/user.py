from datetime import datetime
from pydantic import BaseModel, Field, validator
from typing import Optional

class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=20)
    password: str = Field(min_length=6, max_length=50)

    @validator("password")
    def validate_password(cls, v):
        if v < 6:
            raise ValueError("Пароль должен состоять минимум из 6 символов")
        return v
    
class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: Optional[str]
    timestamp: datetime
    is_active: bool

    class Config:
        from_attributes = True
