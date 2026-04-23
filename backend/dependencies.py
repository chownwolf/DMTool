from core.embedder import Embedder, get_embedder
from core.vector_store import VectorStore


def get_vector_store() -> VectorStore:
    return VectorStore()


def get_embedder_dep() -> Embedder:
    return get_embedder()
