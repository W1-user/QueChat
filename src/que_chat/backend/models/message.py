from datetime import datetime, timezone

from sqlalchemy import Integer, String, Boolean, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.que_chat.database import Base


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True, index=True
    )
    sender: Mapped[str] = mapped_column(String, index=True)
    text: Mapped[str] = mapped_column(
        Text,
    )
    # reaction: Mapped[str] = mapped_column(String)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow())

    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
