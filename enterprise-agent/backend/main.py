from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from backend.database import init_db
from backend.routes import router
# Backend API configuration
# Triggering reload for matplotlib
import uvicorn
import os

# Load environment variables first
load_dotenv()

app = FastAPI(
    title="Nova - Enterprise Voice AI Agent",
    description="Backend services for natural language database query routing, validator/executor, formatting, and voice pipelines.",
    version="1.0.0"
)

# Mount CORS middleware to allow cross-origin requests from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins (e.g. ["http://localhost:3000"])
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database seeding on startup
@app.on_event("startup")
def startup_event():
    print("[Startup] Setting up database structures...")
    init_db()

@app.get("/")
def index():
    return {
        "status": "healthy",
        "service": "Nova - Enterprise Voice AI Agent API",
        "docs": "/docs"
    }

# Include routers
app.include_router(router)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"Running FastAPI on port {port}...")
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)
