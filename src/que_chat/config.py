import os

from pydantic import BaseModel
from pydantic_settings import BaseSettings

from typing import Optional
from dotenv import load_dotenv

load_dotenv()
class DatabaseSettings(BaseModel):
    login = os.getenv("LOGIN")
    password = os.getenv("PASSWORD")
    host = os.getenv("HOST")
    port = os.getenv("PORT")

class FastApiSettings(BaseModel):
    host = os.getenv("HOST")
    port = os.getenv("PORT")

class Settings(BaseSettings):
    db = DatabaseSettings() = DatabaseSettings
    fast = FastApiSettings() = FastApiSettings

settings = Settings()