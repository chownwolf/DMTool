from typing import Literal, Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    collection: Optional[str] = None
    session_id: Optional[str] = None
    history: list[ChatMessage] = []
    max_results: int = Field(default=8, ge=1, le=20)


class Citation(BaseModel):
    book: str
    page: int
    section: str


class StreamChunk(BaseModel):
    type: Literal["chunk", "citations", "content_type", "structured", "done", "error"]
    text: Optional[str] = None
    citations: Optional[list[Citation]] = None
    detected: Optional[str] = None
    data_type: Optional[str] = None
    data: Optional[dict] = None
    message: Optional[str] = None
