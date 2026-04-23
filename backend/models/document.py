from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel


class DocumentStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    INDEXED = "indexed"
    ERROR = "error"


class ContentType(str, Enum):
    STAT_BLOCK = "stat_block"
    SPELL = "spell"
    FEAT = "feat"
    RULES_TEXT = "rules_text"
    TABLE = "table"
    FLAVOR = "flavor"


class DocumentRecord(BaseModel):
    id: str
    filename: str
    book_name: str
    collection: str
    edition: str = "3.5"
    status: DocumentStatus
    chunk_count: int = 0
    page_count: int = 0
    uploaded_at: datetime
    error_message: Optional[str] = None


class IngestionJob(BaseModel):
    job_id: str
    document_id: str
    status: DocumentStatus
    progress: float = 0.0
    current_step: str = "queued"
    chunks_processed: int = 0
    total_chunks: int = 0
    error: Optional[str] = None
