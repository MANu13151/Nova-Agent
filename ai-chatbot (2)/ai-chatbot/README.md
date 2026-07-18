# 🎙️ Enterprise Voice AI Agent — React JS + FastAPI + Google Gemini

A premium, dark-gold themed enterprise analytics assistant that lets you query databases in natural language, validate and run SQL queries securely, render data charts, and interact using real-time voice synthesis and browser-based speech typing.

---

## ✨ Features

- 🗣️ **Speech-To-Text (STT)** — Dictate queries using browser-native voice typing with visual soundwave animations.
- 🔊 **Text-To-Speech (TTS)** — Server-synthesized voice readouts (`gTTS` stream integration) with an autoplay toggle and instant voice interruption when typing or clicking mic.
- 🗃️ **SQL Generation & Validation** — Automatically translates natural language queries into SQLite SELECT queries. Validates queries against unsafe actions (`INSERT`, `UPDATE`, `DROP`, etc.) prior to execution.
- 📊 **Visual Analytics** — Automatically generates interactive datasets and renders dark-themed analytics charts (Matplotlib PNG generator integrated) inline.
- 📋 **Database Schema Inspector** — Expandable sidebar revealing table columns, definitions, and types queryable from the database.
- 🧠 **Conversation Memory** — Retains context for up to 10 exchange turns per active session, managed securely on the server.

---

## 🚀 Quick Start

### Step 1 — Get a Google Gemini API Key

1. Generate a free key on: **[Google AI Studio](https://aistudio.google.com/app/apikey)**.
2. Open the `.env` file in the root directory and replace the value:
   ```env
   REACT_APP_GEMINI_API_KEY=your_actual_api_key_here
   ```

### Step 2 — Start the Backend Server

1. Open a terminal in the root folder.
2. Install Python packages:
   ```bash
   pip install fastapi uvicorn sqlparse gtts matplotlib httpx
   ```
3. Launch the FastAPI server:
   ```bash
   python -m backend.main
   ```
   *The server initializes and seeds `enterprise.db` automatically, serving endpoints on **http://localhost:8000**.*

### Step 3 — Start the React Frontend

1. Open a second terminal in the root folder.
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Run the development environment:
   ```bash
   npm start
   ```
   *The client dashboard opens automatically at **http://localhost:3000**.*

---

## 📁 Project Structure

```
enterprise-agent/
├── backend/            # FastAPI routers & endpoints
├── ai/                 # Gemini API client, memory orchestration, routing
├── sql/                # Schema definitions, safe query validator, SQLite execution
├── voice/              # STT transcription interfaces and TTS stream generation
├── analytics/          # Tabular table formatters and Matplotlib chart styling
├── src/                # React components (ChatWindow, MessageBubble, TypingIndicator)
├── public/             # Static HTML template & manifest assets
├── .env                # API Credentials
├── package.json        # Node dependencies & npm scripts
└── README.md           # Documentation
```

---

## 🆓 API Free Tier Limits

- **15 requests/minute**
- **1 million tokens/day**
- Fully free — no billing or credit cards required.
