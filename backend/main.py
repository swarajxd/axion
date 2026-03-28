"""
main.py — FastAPI application entry-point for VStudy backend (Project Axion).

Run:
    uvicorn main:app --reload --port 8000

Docs:
    http://localhost:8000/docs
"""

import logging
from dotenv import load_dotenv
load_dotenv()  # loads ANTHROPIC_API_KEY from .env
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.upload import router as upload_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
)

app = FastAPI(
    title="VStudy API — Project Axion",
    description="AI-powered ingestion pipeline for 11th & 12th Science students.",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Path("temp").mkdir(exist_ok=True)

app.include_router(upload_router)


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok", "version": app.version}