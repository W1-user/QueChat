from sqlalchemy import Integer, String, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from master import Base

class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, index=True)
    sender: Mapped[str] = mapped_column(String, )
    reaction: Mapped[str] = mapped_column(String, )

    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
