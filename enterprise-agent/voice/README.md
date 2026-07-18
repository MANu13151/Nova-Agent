# NovaAgent STT 🎙️

An offline, privacy-first Voice Assistant backend and frontend. This project uses **Vosk** for lightweight continuous wake word detection ("Hey Nova") and **Faster-Whisper** for highly accurate speech-to-text transcription.

Everything runs 100% locally on your machine—no cloud APIs, no internet connection required.

## Architecture

1. **Wake Word Engine (`wake_word.py`)**: Continuously listens to your physical microphone using an offline Vosk speech recognition model. It is heavily optimized to only look for the phrase "Hey Nova".
2. **Recorder & Transcriber (`recorder.py`, `transcriber.py`)**: Once the wake word is triggered, it uses Voice Activity Detection (VAD) to record your actual command until you stop speaking, and then transcribes it using OpenAI's Faster-Whisper model.
3. **Backend Server (`main.py`, `websocket.py`)**: A FastAPI server that orchestrates the Python modules and broadcasts real-time updates via WebSockets.
4. **Frontend (`frontend/`)**: A clean Vanilla HTML/JS/CSS interface that connects to the backend WebSocket to display real-time system states and transcripts without needing any button presses.

---

## 🚀 How to Run the Project

Follow these steps to run the project on your local machine (Windows, Mac, or Linux).

### 1. Prerequisites
You need to have **Python 3.9+** installed on your computer. 

### 2. Setup the Environment
Open your terminal, navigate to this project folder, and create a clean Python virtual environment:

```bash
# Navigate to the project directory
cd path/to/NovaAgent/STT

# Create a virtual environment
python3 -m venv .venv

# Activate the virtual environment
# On Mac/Linux:
source .venv/bin/activate
# On Windows:
.venv\Scripts\activate
```

### 3. Install Dependencies
With your virtual environment activated, install all the required software packages:

```bash
pip install -r requirements.txt
```

*(Note: Depending on your OS, you may also need to install `portaudio` on your system for microphone access. On Mac, you can do this via `brew install portaudio` if `sounddevice` throws an error).*

### 4. Start the Server
Start the backend server in your terminal:

```bash
python main.py
```
*Note: If you are on a Mac, you may be prompted to allow the Terminal to access your microphone. You must click **Allow**.*

### 5. Open the Interface
Once the server is running, open your web browser and go to:
👉 **http://localhost:18080/app**

You can now sit back and simply say **"Hey Nova"** into your microphone. The screen will instantly react and transcribe your command!
