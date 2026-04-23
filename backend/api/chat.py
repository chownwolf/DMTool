"""
SSE streaming chat endpoint.
"""
from __future__ import annotations

import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from config import settings
from core.embedder import Embedder
from core.llm_client import stream_answer
from core.vector_store import VectorStore
from db.sqlite_store import fts_search
from detection.content_classifier import classify_response
from models.chat import ChatRequest

router = APIRouter()


@router.post("/chat")
async def chat(request: ChatRequest):
    return StreamingResponse(
        _stream(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


async def _stream(request: ChatRequest):
    def sse(data: dict) -> str:
        return f"data: {json.dumps(data)}\n\n"

    try:
        # 1. Embed query
        embedder = Embedder.instance()
        query_vec = embedder.encode_query(request.message)

        # 2. Vector search
        vs = VectorStore()
        where = {"collection": request.collection} if request.collection else None
        vector_results = vs.query(query_vec, n_results=request.max_results, where=where)

        # 3. FTS keyword fallback — extract likely proper nouns (capitalized words)
        import re
        proper_nouns = re.findall(r"\b[A-Z][a-z]{2,}\b", request.message)
        fts_results = []
        if proper_nouns:
            try:
                fts_query = " OR ".join(proper_nouns[:3])
                fts_raw = await fts_search(fts_query, limit=4)
                # Convert FTS results to same shape as vector results
                seen_ids = {r["metadata"].get("chunk_id") for r in vector_results if "chunk_id" in r.get("metadata", {})}
                for row in fts_raw:
                    if row["chunk_id"] not in seen_ids:
                        fts_results.append({
                            "text": row["text"],
                            "metadata": {
                                "book_name": row["book_name"],
                                "section_path": row["section_path"],
                                "chunk_id": row["chunk_id"],
                            },
                            "distance": 0.5,
                        })
            except Exception:
                pass

        combined = vector_results + fts_results
        combined = combined[:request.max_results]

        # 4. Stream LLM response
        full_response = ""
        history = [msg.model_dump() for msg in request.history] if request.history else None

        async for chunk in stream_answer(request.message, combined, history):
            full_response += chunk
            yield sse({"type": "chunk", "text": chunk})

        # 5. Post-process: classify + extract citations
        content_type, clean_text, citations = classify_response(full_response)

        yield sse({"type": "content_type", "detected": content_type})

        if citations:
            yield sse({"type": "citations", "citations": citations})

        yield sse({"type": "done"})

    except Exception as e:
        yield sse({"type": "error", "message": str(e)})
