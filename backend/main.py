from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from config import settings
from db.sqlite_store import init_db
from core.embedder import Embedder
from core.vector_store import get_chroma_client
from api.health import router as health_router
from api.documents import router as documents_router
from api.collections import router as collections_router
from api.chat import router as chat_router
from api.sessions import router as sessions_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting DM Tool backend")
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.chroma_dir.mkdir(parents=True, exist_ok=True)
    await init_db()
    Embedder.instance()
    get_chroma_client()
    logger.info("DM Tool backend ready")
    yield
    logger.info("Shutting down")


app = FastAPI(title="D&D 3.5 DM Tool", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(documents_router, prefix="/api")
app.include_router(collections_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(sessions_router, prefix="/api")
