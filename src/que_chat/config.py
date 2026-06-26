import os

from pydantic import BaseModel
from pydantic_settings import BaseSettings

from typing import Optional
from dotenv import load_dotenv

load_dotenv()
class DatabaseSettings(BaseModel):
    engine: Optional[str] = os.getenv("ENGINE")
    echo: Optional[bool] = False
    eoc: Optional[bool] = False

class FastApiSettings(BaseModel):
    host: Optional[str] = os.getenv("HOST")
    port: Optional[int] = os.getenv("PORT")

class Settings(BaseSettings):
    db: DatabaseSettings = DatabaseSettings()
    fast: FastApiSettings = FastApiSettings()

settings = Settings()