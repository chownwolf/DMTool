from fastapi import APIRouter, Query

from core.embedder import Embedder
from core.vector_store import VectorStore
from db.sqlite_store import fts_search

router = APIRouter()


@router.get("/search")
async def search(
    q: str = Query(..., min_length=1),
    collection: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
    mode: str = Query(default="hybrid"),  # fts | vector | hybrid
):
    results: list[dict] = []
    seen_ids: set[str] = set()

    # FTS keyword search
    if mode in ("fts", "hybrid"):
        safe_q = q.replace('"', '""')
        fts_rows = await fts_search(safe_q, limit=limit)
        for row in fts_rows:
            chunk_id = row["chunk_id"]
            if chunk_id not in seen_ids:
                seen_ids.add(chunk_id)
                results.append({
                    "chunk_id": chunk_id,
                    "text": row["text"],
                    "book_name": row["book_name"],
                    "section_path": row["section_path"],
                    "page_start": 0,
                    "content_type": "rules_text",
                    "score_type": "fts",
                })

    # Vector semantic search
    if mode in ("vector", "hybrid"):
        try:
            embedder = Embedder.instance()
            vec = embedder.encode_query(q)
            vs = VectorStore()
            where = {"collection": collection} if collection else None
            vector_hits = vs.query(vec, n_results=min(limit, 10), where=where)
            for hit in vector_hits:
                meta = hit.get("metadata", {})
                chunk_id = f"{meta.get('document_id', '')}_{meta.get('chunk_index', '')}"
                if chunk_id not in seen_ids:
                    seen_ids.add(chunk_id)
                    results.append({
                        "chunk_id": chunk_id,
                        "text": hit["text"],
                        "book_name": meta.get("book_name", "Unknown"),
                        "section_path": meta.get("section_path", ""),
                        "page_start": meta.get("page_start", 0),
                        "content_type": meta.get("content_type", "rules_text"),
                        "score_type": "vector",
                        "distance": round(hit.get("distance", 0), 3),
                    })
        except Exception:
            pass

    return {"query": q, "count": len(results), "results": results[:limit]}
