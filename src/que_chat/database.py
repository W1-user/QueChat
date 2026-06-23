from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine, AsyncSession
from typing import Annotated

from config import settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(
    f"postgres+psycopg://"
    f"{settings.db.login}:{settings.db.password}"
    f"@{settings.db.host}:{settings.db.port}/QueChatDB"
)
async_session = async_sessionmaker(bind=engine, expire_on_commit=False)


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
