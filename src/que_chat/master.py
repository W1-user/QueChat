from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import desc, select
from que_chat.backend.schemas import message
from que_chat.backend.schemas.user import ProfileBase
from que_chat.backend.dependencies import sessionDep
from que_chat.backend.models.user import User
from que_chat.backend.models.message import Message
from que_chat.database import Base, engine

from que_chat.config import settings

from typing import List
import asyncio
import logging

import uvicorn

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


class ConnectionManager:
    def __init__(self):
        self.active_connection: List[WebSocket] = []
        self.lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self.lock:
            self.active_connection.append(websocket)
            logger.info(f"WebSocket is active. Includes: {len(self.active_connection)}")

        return True

    async def disconnect(self, websocket: WebSocket):
        async with self.lock:
            if websocket in self.active_connection:
                self.active_connection.remove(websocket)
                logger.info(
                    f"WebSocket disconnected. Includes: {len(self.active_connection)}"
                )

    async def broadcast(self, message: dict):
        if not self.active_connection:
            logger.info("Not active includes for send message")
            return

        disconnected = []
        for connected in self.active_connection:
            try:
                await connected.send_json(message)
            except Exception as e:
                logger.info(f"Error sender: {e}")
                disconnected.append(connected)

        for connection in disconnected:
            if connection in self.active_connection:
                self.active_connection.remove(connection)


manager = ConnectionManager()

app = FastAPI(
    title="QueChat",
    description="QueChat - your own message!",
    version="0.1",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def read_root():
    return {"msg": "QueChat API is work", "status": "online"}


@app.post("/messages", response_model=message.Message)
async def create_message(
    message_sch: message.MessageCreate,
    session: sessionDep,
):
    try:
        timestamp = message_sch.timestamp
        if timestamp is None:
            timestamp = datetime.utcnow()
        
        new_message = Message(
            username=message_sch.username,
            text=message_sch.text,
            timestamp=timestamp,
        )

        session.add(new_message)
        await session.commit()
        await session.refresh(new_message)

        logger.info(
            f"Новое сообщение от: {message_sch.username} - {message_sch.text[:50]}"
        )

        await manager.broadcast(
            {
                "type": "new_message",
                "message": {
                    "id": new_message.id,
                    "username": new_message.username,
                    "text": new_message.text,
                    "timestamp": new_message.timestamp.isoformat() if new_message.timestamp else None,
                    "is_deleted": new_message.is_deleted,
                },
            }
        )
        return new_message

    except Exception as e:
        await session.rollback()
        logger.error(f"Ошибка создания сообщения: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@app.get("/messages/history")
async def get_message_history(
    session: sessionDep,
    limit: int = 50,
):
    try:
        stmt = select(Message).order_by(desc(Message.timestamp)).limit(limit)
        result = await session.execute(stmt)
        messages = result.scalars().all()   
        
        history = []
        for msg in reversed(messages):
            history.append({
                "id": msg.id,
                "username": msg.username,
                "text": msg.text,
                "timestamp": msg.timestamp.isoformat() if msg.timestamp else None,
                "is_deleted": msg.is_deleted,
            })

        return history
    except Exception as e:
        logger.error(f"ERROR! - {e}")
        return []
    
# @app.post("/profile/check/{username}", response_model=ProfileBase)
# async def check_user(
#     session: sessionDegp,
#     username: str,
# ):
    
#     stmt = select(User).where(User.username == username)
#     result = await session.execute(stmt)
#     existing_user = result.scalar_one_or_none()

#     return {
#         "exists": existing_user is not None,
#         "username": username
#     }

@app.post("/profile/create/{username}", response_model=ProfileBase)
async def create_user(
    session: sessionDep,
    username: str,
):

    stmt = select(User).where(User.username == username)
    result = await session.execute(stmt)
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with username '{username}' already exists"
        )
    
    new_user = User(
        username=username,
        timestamp=datetime.utcnow(),
    )

    logger.info(f"Был создан новый аккаунт - {username}")

    try:
        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)

        return new_user
    
    except Exception as e:
        await session.rollback()
        logger.error(f"Ошибка создания пользователя: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        logger.info("Disconnect WebSocket")
        await manager.disconnect(websocket)
    except Exception as e:
        logger.info(f"ERROR! - {e}")
        await manager.disconnect(websocket)


if __name__ == "__main__":
    uvicorn.run(
        app="master:app",
        host=f"{settings.fast.host}",
        port=int(settings.fast.port),
        # reload=True,
        log_level="info",
    )
