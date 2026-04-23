"""
SSE streaming chat endpoint.
"""
from __future__ import annotations

import json
import re
import uuid

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from loguru import logger

from config import settings
from core.embedder import Embedder
from core.llm_client import stream_answer
from core.vector_store import VectorStore
from db.sqlite_store import fts_search, save_message, touch_session
from detection.content_classifier import classify_response
from models.chat import ChatRequest

router = APIRouter()


@router.post("/chat")
async def chat(request: ChatRequest):
    return StreamingResponse(
        _stream(request),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
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
        total_in_db = vs.count()
        where = {"collection": request.collection} if request.collection else None
        vector_results = vs.query(query_vec, n_results=request.max_results, where=where)
        logger.info(f"Retrieval: db_total={total_in_db} vector_hits={len(vector_results)} collection_filter={request.collection!r}")
        for i, r in enumerate(vector_results[:3]):
            meta = r.get("metadata", {})
            preview = r.get("text", "")[:80].replace("\n", " ")
            logger.info(f"  chunk[{i}] book={meta.get('book_name')} dist={r.get('distance', '?'):.3f} | {preview}")

        # 3. FTS keyword fallback — OR query across significant terms
        _STOPWORDS = {
            "what", "how", "who", "where", "when", "why", "give", "tell",
            "show", "find", "list", "does", "can", "will", "are", "get",
            "make", "take", "with", "from", "that", "this", "the", "and",
            "for", "its", "about", "area", "effect", "stat", "block", "full",
            "me", "my", "you", "your", "all", "any", "would", "could", "have",
            "has", "had", "not", "use", "used", "work", "works", "is", "in",
            "on", "at", "to", "a", "an", "of", "do", "did", "be", "been",
            "way", "into", "out", "also", "just", "more", "some", "many",
        }
        terms = list(dict.fromkeys(
            w.lower() for w in re.findall(r"\b[A-Za-z]{3,}\b", request.message)
            if w.lower() not in _STOPWORDS
        ))

        fts_results = []
        if terms:
            try:
                seen_ids = {
                    f"{r['metadata'].get('document_id')}_chunk_{r['metadata'].get('chunk_index')}"
                    for r in vector_results if r.get("metadata")
                }
                # OR query: "fireball OR spell" → BM25 ranks chunks matching most terms highest
                fts_query = " OR ".join(terms[:6])
                fts_raw = await fts_search(fts_query, limit=10)
                for row in fts_raw:
                    if row["chunk_id"] not in seen_ids:
                        seen_ids.add(row["chunk_id"])
                        fts_results.append({
                            "text": row["text"],
                            "metadata": {"book_name": row["book_name"], "section_path": row["section_path"]},
                            "distance": 0.4,
                        })
                logger.info(f"  FTS query={fts_query!r} hits={len(fts_results)}")
            except Exception as exc:
                logger.warning(f"FTS fallback failed: {exc}")

        # No cap here — let prompt_builder trim to context budget
        combined = vector_results + fts_results

        # 4. Stream LLM response
        full_response = ""
        history = [msg.model_dump() for msg in request.history] if request.history else None

        async for chunk in stream_answer(request.message, combined, history):
            full_response += chunk
            yield sse({"type": "chunk", "text": chunk})

        # 5. Post-process
        content_type, clean_text, citations = classify_response(full_response)
        yield sse({"type": "content_type", "detected": content_type})
        if citations:
            yield sse({"type": "citations", "citations": citations})

        # 6. Persist messages if session active
        if request.session_id:
            try:
                await save_message(str(uuid.uuid4()), request.session_id, "user", request.message)
                await save_message(str(uuid.uuid4()), request.session_id, "assistant", clean_text, content_type, citations)
                await touch_session(request.session_id)
            except Exception:
                pass  # don't fail the response if persistence errors

        yield sse({"type": "done"})

    except Exception as e:
        yield sse({"type": "error", "message": str(e)})
