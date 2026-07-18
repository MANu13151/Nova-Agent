import argparse
import asyncio
import io
import tempfile
import wave
from pathlib import Path

import numpy as np
from fastapi import FastAPI, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from faster_whisper import WhisperModel

from recorder import SAMPLE_RATE, record_audio
from transcriber import MODEL_SIZE, transcribe_audio
from websocket import manager


CHUNK_SECONDS = 3
CHANNELS = 1
SAMPLE_WIDTH_BYTES = 2
TRANSCRIBE_EVERY_BYTES = SAMPLE_RATE * CHUNK_SECONDS * SAMPLE_WIDTH_BYTES
FRONTEND_DIR = Path(__file__).parent / "frontend"

from wake_word import wake_word_event, set_paused, start_wake_word_thread

app = FastAPI(title="NovaAgent STT")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")

if FRONTEND_DIR.exists():
    app.mount("/frontend", StaticFiles(directory=FRONTEND_DIR), name="frontend")


@app.on_event("startup")
async def startup_event():
    # Start the wake word thread
    start_wake_word_thread()
    # Start the background task to listen for the event
    asyncio.create_task(wake_word_loop())


async def wake_word_loop():
    while True:
        await asyncio.sleep(0.1)
        if wake_word_event.is_set():
            wake_word_event.clear()
            set_paused(True)
            
            try:
                await manager.broadcast("[System] Wake word detected! Listening...")
                
                # Run blocking recording in a thread so we don't block the async loop
                output_file = "wake_word_record.wav"
                await asyncio.to_thread(record_audio, output_file)
                
                await manager.broadcast("[System] Processing audio...")
                text = await asyncio.to_thread(transcribe_with_loaded_model, output_file)
                
                if text:
                    await manager.broadcast(text)
                else:
                    await manager.broadcast("[System] Could not understand audio.")
            except Exception as e:
                print(f"Error in wake word flow: {e}")
                await manager.broadcast(f"[System] Error: {e}")
            finally:
                set_paused(False)


@app.get("/")
def health_check():
    return {
        "status": "Hey Nova server is running",
        "service": "NovaAgent STT",
        "connected_browsers": len(manager.active_connections),
        "listen_ws_url": "ws://localhost:18080/ws",
        "audio_ws_url": "ws://localhost:18080/ws/transcribe",
        "upload_url": "http://localhost:18080/transcribe",
        "frontend_url": "http://localhost:18080/app",
    }


@app.get("/app")
def frontend_app():
    return FileResponse(FRONTEND_DIR / "index.html")


@app.websocket("/ws")
async def frontend_transcript_socket(websocket: WebSocket):
    """
    Browser connects here to receive transcript updates.
    This matches websocket.py's intended frontend flow.
    """
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.post("/transcript")
async def receive_transcript(data: dict):
    """
    Manual/test endpoint to push text to every connected frontend.
    Example:
    curl -X POST http://localhost:18080/transcript \
      -H "Content-Type: application/json" \
      -d '{"text": "Hey Nova is working"}'
    """
    text = data.get("text", "").strip()
    if text:
        await manager.broadcast(text)

    return {
        "status": "sent",
        "text": text,
        "clients_reached": len(manager.active_connections),
    }


@app.post("/transcribe")
async def transcribe_file(file: UploadFile = File(...)):
    suffix = Path(file.filename or "audio.wav").suffix or ".wav"

    with tempfile.NamedTemporaryFile(delete=True, suffix=suffix) as temp_audio:
        temp_audio.write(await file.read())
        temp_audio.flush()
        text = transcribe_with_loaded_model(temp_audio.name)

    if text:
        await manager.broadcast(text)

    return {"text": text}


@app.websocket("/ws/transcribe")
async def realtime_transcribe(websocket: WebSocket):
    """
    Accepts 16 kHz mono PCM int16 audio bytes from the frontend.
    Sends partial transcript messages every few seconds:
    {"type": "partial", "text": "..."}
    """
    await websocket.accept()
    audio_buffer = bytearray()
    last_transcribed_size = 0
    last_text = ""

    try:
        while True:
            message = await websocket.receive()

            if "bytes" in message and message["bytes"]:
                audio_buffer.extend(message["bytes"])

            if "text" in message and message["text"] == "stop":
                break

            ready_for_next_partial = (
                len(audio_buffer) - last_transcribed_size >= TRANSCRIBE_EVERY_BYTES
            )

            if ready_for_next_partial:
                last_transcribed_size = len(audio_buffer)
                text = await asyncio.to_thread(
                    transcribe_pcm_bytes,
                    bytes(audio_buffer),
                    SAMPLE_RATE,
                )

                if text and text != last_text:
                    last_text = text
                    await manager.broadcast(text)
                    await websocket.send_json({"type": "partial", "text": text})

        final_text = await asyncio.to_thread(
            transcribe_pcm_bytes,
            bytes(audio_buffer),
            SAMPLE_RATE,
        )
        if final_text and final_text != last_text:
            await manager.broadcast(final_text)
        await websocket.send_json({"type": "final", "text": final_text})

    except WebSocketDisconnect:
        return


def transcribe_with_loaded_model(filename: str) -> str:
    segments, _ = model.transcribe(filename)
    return " ".join(segment.text.strip() for segment in segments).strip()


def transcribe_pcm_bytes(audio_bytes: bytes, sample_rate: int) -> str:
    if not audio_bytes:
        return ""

    audio = np.frombuffer(audio_bytes, dtype=np.int16)
    if audio.size == 0:
        return ""

    wav_bytes = pcm_to_wav_bytes(audio, sample_rate)

    with tempfile.NamedTemporaryFile(delete=True, suffix=".wav") as temp_audio:
        temp_audio.write(wav_bytes)
        temp_audio.flush()
        return transcribe_with_loaded_model(temp_audio.name)


def pcm_to_wav_bytes(audio: np.ndarray, sample_rate: int) -> bytes:
    wav_buffer = io.BytesIO()

    with wave.open(wav_buffer, "wb") as wav_file:
        wav_file.setnchannels(CHANNELS)
        wav_file.setsampwidth(SAMPLE_WIDTH_BYTES)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(audio.tobytes())

    return wav_buffer.getvalue()


def run_cli(output_file: str) -> None:
    recorded_file = record_audio(output_file)
    text = transcribe_audio(recorded_file)
    print("\nTranscribed Text:")
    print(text)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="NovaAgent speech-to-text service")
    parser.add_argument(
        "--cli",
        action="store_true",
        help="record from microphone, save a wav file, and transcribe it",
    )
    parser.add_argument(
        "--output",
        default="output.wav",
        help="output wav path for --cli mode",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=18080,
        help="port for the web server",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()

    if args.cli:
        run_cli(args.output)
    else:
        import uvicorn

        uvicorn.run("main:app", host="0.0.0.0", port=args.port, reload=True)
