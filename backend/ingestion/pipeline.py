"""
Ingestion pipeline: parse → clean → chunk → embed → store.
Runs as a FastAPI background task.
"""
from __future__ import annotations

import uuid
from pathlib import Path

from loguru import logger

from config import settings
from core.embedder import Embedder
from core.vector_store import VectorStore
from db.sqlite_store import (
    add_fts_chunks,
    create_job,
    update_document_status,
    update_job,
)
from ingestion.cleaner import clean_text
from ingestion.chunker import chunk_blocks
from models.document import ContentType, DocumentStatus, IngestionJob


async def run_ingestion(document_id: str, file_path: Path, book_name: str, collection: str) -> None:
    job = IngestionJob(
        job_id=str(uuid.uuid4()),
        document_id=document_id,
        status=DocumentStatus.PROCESSING,
        current_step="parsing",
    )
    await create_job(job)
    await update_document_status(document_id, DocumentStatus.PROCESSING)

    try:
        # 1. Parse
        suffix = file_path.suffix.lower()
        if suffix == ".pdf":
            from ingestion.pdf_parser import parse_pdf
            raw_blocks, page_count = parse_pdf(file_path)
        elif suffix in (".docx", ".doc"):
            from ingestion.docx_parser import parse_docx
            raw_blocks, page_count = parse_docx(file_path)
        else:
            raise ValueError(f"Unsupported file type: {suffix}")

        await update_job(job.job_id, current_step="cleaning", progress=0.1)

        # 2. Clean text in place
        for block in raw_blocks:
            block.text = clean_text(block.text)

        await update_job(job.job_id, current_step="chunking", progress=0.2)

        # 3. Chunk
        chunks = chunk_blocks(raw_blocks, book_name=book_name)
        total_chunks = len(chunks)
        await update_job(job.job_id, current_step="embedding", progress=0.3, total_chunks=total_chunks)

        if total_chunks == 0:
            await update_document_status(document_id, DocumentStatus.INDEXED, 0, page_count)
            await update_job(job.job_id, status="indexed", progress=1.0, current_step="done")
            return

        # 4. Embed in batches
        embedder = Embedder.instance()
        vs = VectorStore()
        fts_batch: list[dict] = []

        BATCH = settings.embedding_batch_size
        processed = 0

        for batch_start in range(0, total_chunks, BATCH):
            batch = chunks[batch_start: batch_start + BATCH]
            texts = []
            for c in batch:
                prefix = ""
                if c.content_type == "stat_block":
                    prefix = "D&D 3.5 stat block: "
                elif c.content_type == "spell":
                    prefix = "D&D 3.5 spell: "
                elif c.content_type == "feat":
                    prefix = "D&D 3.5 feat: "
                texts.append(prefix + c.text)

            embeddings = embedder.encode(texts)

            ids = [f"{document_id}_chunk_{c.chunk_index}" for c in batch]
            metadatas = [
                {
                    "document_id": document_id,
                    "book_name": book_name,
                    "collection": collection,
                    "page_start": c.page_start,
                    "page_end": c.page_end,
                    "section_path": c.section_path,
                    "content_type": c.content_type,
                    "chunk_index": c.chunk_index,
                }
                for c in batch
            ]

            vs.upsert(ids=ids, embeddings=embeddings, documents=[c.text for c in batch], metadatas=metadatas)

            for c, chunk_id in zip(batch, ids):
                fts_batch.append({
                    "chunk_id": chunk_id,
                    "text": c.text,
                    "section_path": c.section_path,
                    "book_name": book_name,
                })

            processed += len(batch)
            progress = 0.3 + 0.65 * (processed / total_chunks)
            await update_job(job.job_id, chunks_processed=processed, progress=progress)

        # 5. FTS index
        await update_job(job.job_id, current_step="indexing_fts", progress=0.95)
        await add_fts_chunks(document_id, fts_batch)

        await update_document_status(document_id, DocumentStatus.INDEXED, total_chunks, page_count)
        await update_job(job.job_id, status="indexed", progress=1.0, current_step="done",
                         chunks_processed=total_chunks)
        logger.info(f"Ingestion complete: {document_id}, {total_chunks} chunks")

    except Exception as e:
        logger.exception(f"Ingestion failed for {document_id}: {e}")
        await update_document_status(document_id, DocumentStatus.ERROR, error_message=str(e))
        await update_job(job.job_id, status="error", error=str(e), current_step="error")
