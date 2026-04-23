import shutil
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile, Form
from fastapi.responses import JSONResponse

from config import settings
from core.vector_store import VectorStore
from db.sqlite_store import (
    create_document,
    delete_document,
    get_document,
    get_job,
    list_documents,
)
from ingestion.pipeline import run_ingestion
from models.document import DocumentRecord, DocumentStatus

router = APIRouter()

ALLOWED_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
}
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}


@router.post("/documents/upload", status_code=202)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile,
    book_name: str = Form(...),
    collection: str = Form(default="default"),
    edition: str = Form(default="3.5"),
):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    document_id = str(uuid.uuid4())
    dest_dir = settings.upload_dir / document_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / f"original{suffix}"

    with dest_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    doc = DocumentRecord(
        id=document_id,
        filename=file.filename or f"document{suffix}",
        book_name=book_name,
        collection=collection,
        edition=edition,
        status=DocumentStatus.QUEUED,
        uploaded_at=datetime.utcnow(),
    )
    await create_document(doc)
    background_tasks.add_task(run_ingestion, document_id, dest_path, book_name, collection)

    return {"document_id": document_id, "filename": doc.filename, "status": "queued"}


@router.get("/documents")
async def list_all_documents():
    docs = await list_documents()
    return {"documents": [d.model_dump() for d in docs]}


@router.get("/documents/{document_id}/status")
async def get_document_status(document_id: str):
    doc = await get_document(document_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    job = await get_job(document_id)
    return {
        "document_id": document_id,
        "status": doc.status.value,
        "progress": job.progress if job else 0.0,
        "current_step": job.current_step if job else "unknown",
        "chunks_processed": job.chunks_processed if job else 0,
        "total_chunks": job.total_chunks if job else 0,
    }


@router.delete("/documents/{document_id}", status_code=204)
async def remove_document(document_id: str):
    doc = await get_document(document_id)
    if not doc:
        raise HTTPException(404, "Document not found")

    vs = VectorStore()
    vs.delete_by_document(document_id)

    upload_dir = settings.upload_dir / document_id
    if upload_dir.exists():
        shutil.rmtree(upload_dir)

    await delete_document(document_id)
