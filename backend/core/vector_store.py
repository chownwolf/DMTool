from typing import Optional

import chromadb
from chromadb.config import Settings as ChromaSettings
from loguru import logger

from config import settings

_client: chromadb.PersistentClient | None = None


def get_chroma_client() -> chromadb.PersistentClient:
    global _client
    if _client is None:
        settings.chroma_dir.mkdir(parents=True, exist_ok=True)
        _client = chromadb.PersistentClient(
            path=str(settings.chroma_dir),
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        logger.info(f"ChromaDB client ready at {settings.chroma_dir}")
    return _client


class VectorStore:
    COLLECTION_NAME = "dnd_documents"

    def __init__(self) -> None:
        self.client = get_chroma_client()
        self._collection = self.client.get_or_create_collection(
            name=self.COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )

    def upsert(
        self,
        ids: list[str],
        embeddings: list[list[float]],
        documents: list[str],
        metadatas: list[dict],
    ) -> None:
        self.client.get_or_create_collection(
            name=self.COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        ).upsert(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
        )

    def query(
        self,
        query_embedding: list[float],
        n_results: int = 8,
        where: Optional[dict] = None,
    ) -> list[dict]:
        col = self.client.get_or_create_collection(
            name=self.COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
        count = col.count()
        if count == 0:
            return []
        n = min(n_results, count)

        kwargs: dict = {"query_embeddings": [query_embedding], "n_results": n, "include": ["documents", "metadatas", "distances"]}
        if where:
            kwargs["where"] = where

        results = col.query(**kwargs)
        chunks = []
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            chunks.append({"text": doc, "metadata": meta, "distance": dist})
        return chunks

    def delete_by_document(self, document_id: str) -> None:
        col = self.client.get_or_create_collection(
            name=self.COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
        results = col.get(where={"document_id": document_id})
        if results["ids"]:
            col.delete(ids=results["ids"])
            logger.info(f"Deleted {len(results['ids'])} chunks for document {document_id}")

    def count(self) -> int:
        return self._collection.count()

    def status(self) -> dict:
        try:
            return {"status": "connected", "chunk_count": self.count()}
        except Exception as e:
            return {"status": "error", "error": str(e)}
