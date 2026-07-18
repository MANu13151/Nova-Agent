from fastapi import FastAPI
from routes import router
from api import api_router

app = FastAPI()

app.include_router(router)
app.include_router(api_router)

@app.get("/")
def home():
    return {
        "message": "AI Executive Assistant Project Running Successfully"
    }