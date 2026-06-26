import os

from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine, AsyncSession
from typing import Annotated

from config import settings
from dotenv import load_dotenv

load_dotenv()


class Base(DeclarativeBase):
    pass


database_url = str(settings.db.engine)

engine = create_async_engine(
    url=database_url,
    echo=settings.db.echo,
)
async_session = async_sessionmaker(
    bind=engine,
    expire_on_commit=settings.db.eoc,
)


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
