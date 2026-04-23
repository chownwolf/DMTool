import json
from datetime import datetime
from pathlib import Path
from typing import Optional

import aiosqlite

from config import settings
from models.document import DocumentRecord, DocumentStatus, IngestionJob


async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(settings.sqlite_path)
    db.row_factory = aiosqlite.Row
    return db


async def init_db() -> None:
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(settings.sqlite_path) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL DEFAULT 'New Session',
                collection TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                content_type TEXT NOT NULL DEFAULT 'rules_text',
                citations TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL,
                FOREIGN KEY (session_id) REFERENCES sessions(id)
            )
        """)
        await db.execute("CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id)")
        await db.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                book_name TEXT NOT NULL,
                collection TEXT NOT NULL DEFAULT 'default',
                edition TEXT NOT NULL DEFAULT '3.5',
                status TEXT NOT NULL DEFAULT 'queued',
                chunk_count INTEGER NOT NULL DEFAULT 0,
                page_count INTEGER NOT NULL DEFAULT 0,
                uploaded_at TEXT NOT NULL,
                error_message TEXT
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS ingestion_jobs (
                job_id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'queued',
                progress REAL NOT NULL DEFAULT 0.0,
                current_step TEXT NOT NULL DEFAULT 'queued',
                chunks_processed INTEGER NOT NULL DEFAULT 0,
                total_chunks INTEGER NOT NULL DEFAULT 0,
                error TEXT,
                FOREIGN KEY (document_id) REFERENCES documents(id)
            )
        """)
        await db.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts
            USING fts5(document_id, chunk_id, text, section_path, book_name)
        """)
        await db.commit()


async def create_document(doc: DocumentRecord) -> None:
    async with aiosqlite.connect(settings.sqlite_path) as db:
        await db.execute(
            """INSERT INTO documents
               (id, filename, book_name, collection, edition, status, chunk_count, page_count, uploaded_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (doc.id, doc.filename, doc.book_name, doc.collection, doc.edition,
             doc.status.value, doc.chunk_count, doc.page_count,
             doc.uploaded_at.isoformat()),
        )
        await db.commit()


async def get_document(document_id: str) -> Optional[DocumentRecord]:
    async with aiosqlite.connect(settings.sqlite_path) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM documents WHERE id = ?", (document_id,)
        ) as cursor:
            row = await cursor.fetchone()
            if not row:
                return None
            return _row_to_document(row)


async def list_documents() -> list[DocumentRecord]:
    async with aiosqlite.connect(settings.sqlite_path) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM documents ORDER BY uploaded_at DESC"
        ) as cursor:
            rows = await cursor.fetchall()
            return [_row_to_document(r) for r in rows]


async def update_document_status(
    document_id: str,
    status: DocumentStatus,
    chunk_count: int = 0,
    page_count: int = 0,
    error_message: Optional[str] = None,
) -> None:
    async with aiosqlite.connect(settings.sqlite_path) as db:
        await db.execute(
            """UPDATE documents
               SET status = ?, chunk_count = ?, page_count = ?, error_message = ?
               WHERE id = ?""",
            (status.value, chunk_count, page_count, error_message, document_id),
        )
        await db.commit()


async def delete_document(document_id: str) -> None:
    async with aiosqlite.connect(settings.sqlite_path) as db:
        await db.execute("DELETE FROM chunks_fts WHERE document_id = ?", (document_id,))
        await db.execute("DELETE FROM ingestion_jobs WHERE document_id = ?", (document_id,))
        await db.execute("DELETE FROM documents WHERE id = ?", (document_id,))
        await db.commit()


async def create_job(job: IngestionJob) -> None:
    async with aiosqlite.connect(settings.sqlite_path) as db:
        await db.execute(
            """INSERT INTO ingestion_jobs
               (job_id, document_id, status, progress, current_step, chunks_processed, total_chunks)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (job.job_id, job.document_id, job.status.value, job.progress,
             job.current_step, job.chunks_processed, job.total_chunks),
        )
        await db.commit()


async def update_job(job_id: str, **kwargs) -> None:
    if not kwargs:
        return
    fields = ", ".join(f"{k} = ?" for k in kwargs)
    values = list(kwargs.values()) + [job_id]
    async with aiosqlite.connect(settings.sqlite_path) as db:
        await db.execute(
            f"UPDATE ingestion_jobs SET {fields} WHERE job_id = ?", values
        )
        await db.commit()


async def get_job(document_id: str) -> Optional[IngestionJob]:
    async with aiosqlite.connect(settings.sqlite_path) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM ingestion_jobs WHERE document_id = ? ORDER BY rowid DESC LIMIT 1",
            (document_id,),
        ) as cursor:
            row = await cursor.fetchone()
            if not row:
                return None
            return IngestionJob(
                job_id=row["job_id"],
                document_id=row["document_id"],
                status=DocumentStatus(row["status"]),
                progress=row["progress"],
                current_step=row["current_step"],
                chunks_processed=row["chunks_processed"],
                total_chunks=row["total_chunks"],
                error=row["error"],
            )


async def add_fts_chunks(document_id: str, chunks: list[dict]) -> None:
    async with aiosqlite.connect(settings.sqlite_path) as db:
        await db.executemany(
            "INSERT INTO chunks_fts (document_id, chunk_id, text, section_path, book_name) VALUES (?, ?, ?, ?, ?)",
            [
                (document_id, c["chunk_id"], c["text"], c.get("section_path", ""), c.get("book_name", ""))
                for c in chunks
            ],
        )
        await db.commit()


async def fts_search(query: str, limit: int = 8) -> list[dict]:
    async with aiosqlite.connect(settings.sqlite_path) as db:
        db.row_factory = aiosqlite.Row
        safe_query = query.replace('"', '""')
        async with db.execute(
            "SELECT chunk_id, document_id, text, section_path, book_name FROM chunks_fts WHERE chunks_fts MATCH ? LIMIT ?",
            (safe_query, limit),
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------

async def create_session(session_id: str, title: str, collection: Optional[str]) -> None:
    now = datetime.utcnow().isoformat()
    async with aiosqlite.connect(settings.sqlite_path) as db:
        await db.execute(
            "INSERT INTO sessions (id, title, collection, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (session_id, title, collection, now, now),
        )
        await db.commit()


async def list_sessions() -> list[dict]:
    async with aiosqlite.connect(settings.sqlite_path) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM sessions ORDER BY updated_at DESC LIMIT 50"
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]


async def delete_session(session_id: str) -> None:
    async with aiosqlite.connect(settings.sqlite_path) as db:
        await db.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
        await db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        await db.commit()


async def touch_session(session_id: str) -> None:
    now = datetime.utcnow().isoformat()
    async with aiosqlite.connect(settings.sqlite_path) as db:
        await db.execute("UPDATE sessions SET updated_at = ? WHERE id = ?", (now, session_id))
        await db.commit()


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------

async def save_message(
    message_id: str,
    session_id: str,
    role: str,
    content: str,
    content_type: str = "rules_text",
    citations: list = None,
) -> None:
    now = datetime.utcnow().isoformat()
    async with aiosqlite.connect(settings.sqlite_path) as db:
        await db.execute(
            "INSERT INTO messages (id, session_id, role, content, content_type, citations, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (message_id, session_id, role, content, content_type, json.dumps(citations or []), now),
        )
        await db.commit()


async def get_session_messages(session_id: str) -> list[dict]:
    async with aiosqlite.connect(settings.sqlite_path) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC",
            (session_id,),
        ) as cursor:
            rows = await cursor.fetchall()
            result = []
            for r in rows:
                d = dict(r)
                d["citations"] = json.loads(d["citations"])
                result.append(d)
            return result


def _row_to_document(row) -> DocumentRecord:
    return DocumentRecord(
        id=row["id"],
        filename=row["filename"],
        book_name=row["book_name"],
        collection=row["collection"],
        edition=row["edition"],
        status=DocumentStatus(row["status"]),
        chunk_count=row["chunk_count"],
        page_count=row["page_count"],
        uploaded_at=datetime.fromisoformat(row["uploaded_at"]),
        error_message=row["error_message"],
    )
