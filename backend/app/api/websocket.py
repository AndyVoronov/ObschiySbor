from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from app.core.auth import decode_token
import json
import asyncio

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        # {user_id: [websocket, ...]}
        self.active_connections: dict[str, list[WebSocket]] = {}
        # {room_id: set(user_id)}
        self.chat_rooms: dict[str, set[str]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id] = [
                ws for ws in self.active_connections[user_id] if ws != websocket
            ]
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        # Remove from chat rooms
        for room_id, members in self.chat_rooms.items():
            if user_id in members:
                members.discard(user_id)
                if not members:
                    del self.chat_rooms[room_id]

    async def send_to_user(self, user_id: str, message: dict):
        if user_id in self.active_connections:
            dead = []
            for ws in self.active_connections[user_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.disconnect(ws, user_id)

    async def broadcast_to_room(self, room_id: str, message: dict, exclude_user: str = None):
        members = self.chat_rooms.get(room_id, set())
        for uid in members:
            if uid != exclude_user:
                await self.send_to_user(uid, message)

    def join_room(self, room_id: str, user_id: str):
        if room_id not in self.chat_rooms:
            self.chat_rooms[room_id] = set()
        self.chat_rooms[room_id].add(user_id)

    def leave_room(self, room_id: str, user_id: str):
        if room_id in self.chat_rooms:
            self.chat_rooms[room_id].discard(user_id)


manager = ConnectionManager()


@router.websocket("/ws/notifications")
async def ws_notifications(websocket: WebSocket, token: str = Query(...)):
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001)
            return
    except Exception:
        await websocket.close(code=4001)
        return

    await manager.connect(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)


@router.websocket("/ws/chat/{room_id}")
async def ws_chat(websocket: WebSocket, room_id: str, token: str = Query(...)):
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001)
            return
    except Exception:
        await websocket.close(code=4001)
        return

    await manager.connect(websocket, user_id)
    manager.join_room(room_id, user_id)

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            # Broadcast to all room members
            await manager.broadcast_to_room(room_id, {
                "type": "chat_message",
                "room_id": room_id,
                "user_id": user_id,
                "message": message.get("message", ""),
            }, exclude_user=user_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
