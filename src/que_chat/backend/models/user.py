from sqlalchemy import Integer, String
from sqlalchemy.orm import mapped_column, Mapped

from que_chat.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True, index=True
    )
    nickname: Mapped[str] = mapped_column(String, default="ghost")

    # role: Mapped[str] = mapped_column(String, default="User")
