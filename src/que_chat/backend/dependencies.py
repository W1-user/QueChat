from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated

from database import get_db

sessionDep = Annotated[AsyncSession, Depends(get_db)]
