from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import json

app = FastAPI()

# Allow React (localhost:3000 or 5173) to connect from the browser
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConnectionManager:
    """Keeps track of every browser tab currently connected via WebSocket."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[WS] Browser connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(f"[WS] Browser disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, text: str):
        """Push a transcript string to every connected browser tab."""
        payload = json.dumps({"transcript": text})
        dead = []
        for ws in self.active_connections:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()


# ── WebSocket endpoint ─────────────────────────────────────────────────────────
# React connects here and just listens. Server pushes whenever a transcript arrives.

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep the connection alive.
            # The browser doesn't need to send anything — we only push.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ── HTTP endpoint (for testing without the full pipeline) ─────────────────────
# During development, use curl to simulate what main.py will eventually call.
# curl -X POST http://localhost:8000/transcript \
#      -H "Content-Type: application/json" \
#      -d '{"text": "Hey Nova is working"}'

@app.post("/transcript")
async def receive_transcript(data: dict):
    text = data.get("text", "").strip()
    if text:
        await manager.broadcast(text)
    return {
        "status": "sent",
        "text": text,
        "clients_reached": len(manager.active_connections),
    }


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "status": "Hey Nova server is running",
        "connected_browsers": len(manager.active_connections),
        "ws_url": "ws://localhost:8000/ws",
        "test_cmd": "curl -X POST http://localhost:8000/transcript -H 'Content-Type: application/json' -d '{\"text\": \"hello\"}'",
    }