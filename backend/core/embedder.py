from functools import lru_cache
from typing import Union

import torch
from loguru import logger
from sentence_transformers import SentenceTransformer

from config import settings

_model: SentenceTransformer | None = None


def get_embedder() -> "Embedder":
    return Embedder.instance()


class Embedder:
    _instance: "Embedder | None" = None

    def __init__(self) -> None:
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Loading embedding model {settings.embedding_model} on {self.device}")
        self.model = SentenceTransformer(settings.embedding_model, device=self.device)
        self.dimension = self.model.get_sentence_embedding_dimension()
        logger.info(f"Embedder ready: dim={self.dimension}, device={self.device}")

    @classmethod
    def instance(cls) -> "Embedder":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def encode(self, texts: list[str], batch_size: int | None = None) -> list[list[float]]:
        bs = batch_size or settings.embedding_batch_size
        embeddings = self.model.encode(
            texts,
            batch_size=bs,
            show_progress_bar=False,
            convert_to_numpy=True,
            normalize_embeddings=True,
        )
        return embeddings.tolist()

    def encode_query(self, query: str) -> list[float]:
        return self.encode([query])[0]
