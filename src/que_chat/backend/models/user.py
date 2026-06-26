from datetime import datetime

from sqlalchemy import Integer, String, DateTime
from sqlalchemy.orm import mapped_column, Mapped

from que_chat.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True, index=True
    )
    username: Mapped[str] = mapped_column(String, default="ghost")
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    # role: Mapped[str] = mapped_column(String, default="User")
