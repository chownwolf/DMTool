from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.vector_store import VectorStore
from db.sqlite_store import list_documents

router = APIRouter()


class CollectionCreate(BaseModel):
    name: str
    description: str = ""


@router.get("/collections")
async def list_collections():
    docs = await list_documents()
    collection_map: dict[str, int] = {}
    for doc in docs:
        collection_map[doc.collection] = collection_map.get(doc.collection, 0) + 1
    return {
        "collections": [
            {"name": name, "document_count": count}
            for name, count in collection_map.items()
        ]
    }


@router.post("/collections", status_code=201)
async def create_collection(body: CollectionCreate):
    # Collections are implicit (created when a document is uploaded to them)
    return {"name": body.name, "description": body.description}
