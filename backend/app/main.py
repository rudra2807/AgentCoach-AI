from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

load_dotenv()

APP_ENV = os.getenv("APP_ENV", "dev")


app = FastAPI(title="MVP Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get('/health-check')
def health_check():
    return {"status": "Backend running "}

@app.on_event("startup")
def startup():
    print(f"Backend starting in {APP_ENV} mode")
