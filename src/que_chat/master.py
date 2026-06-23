from fastapi import FastAPI, HTTPException, status, WebSocket, WebSocketDisconnect
from src.que_chat.backend.schemas import message
from src.que_chat.backend.dependencies import sessionDep
from src.que_chat.backend.models.user import User
from src.que_chat.backend.models.message import Message

from config import settings

from typing import List
import asyncio
import logging

import uvicorn

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


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
)


@app.get("/")
async def read_root():
    return {"msg": "QueChat API is work", "status": "online"}


@app.post("/messages", response_model=message.Message)
async def create_message(
    message_sch: message.MessageCreate,
    db: sessionDep,
):
    try:
        new_message = Message(
            sender=message_sch.username,
            text=message_sch.text,
            timestamp=message_sch.timestamp,
        )

        db.add(new_message)
        await db.commit()
        await db.refresh(new_message)

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
                    "timestamp": new_message.timestamp.isoformat(),
                },
            }
        )
        return new_message

    except Exception as e:
        await db.rollback()
        logger.error(f"Ошибка создания сообщения: {e}")
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
        host=f"{int(settings.fast.host)}",
        port=f"{int(settings.fast.port)}",
        reload=True,
        log_level="info",
    )
