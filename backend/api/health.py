import torch
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from core.embedder import Embedder
from core.vector_store import VectorStore

router = APIRouter()


@router.get("/health")
async def health() -> JSONResponse:
    try:
        embedder = Embedder.instance()
        vs = VectorStore()
        vs_status = vs.status()
        return JSONResponse({
            "status": "ok",
            "chroma": vs_status["status"],
            "chunk_count": vs_status.get("chunk_count", 0),
            "embedder": "loaded",
            "model": embedder.model.get_sentence_embedding_dimension(),
            "device": embedder.device,
            "cuda_available": torch.cuda.is_available(),
        })
    except Exception as e:
        return JSONResponse({"status": "error", "error": str(e)}, status_code=500)
