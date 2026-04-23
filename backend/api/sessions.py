import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db.sqlite_store import (
    create_session,
    delete_session,
    get_session_messages,
    list_sessions,
)

router = APIRouter()


class SessionCreate(BaseModel):
    title: str
    collection: str | None = None


@router.get("/sessions")
async def list_all_sessions():
    sessions = await list_sessions()
    return {"sessions": sessions}


@router.post("/sessions", status_code=201)
async def new_session(body: SessionCreate):
    session_id = str(uuid.uuid4())
    await create_session(session_id, body.title, body.collection)
    return {"id": session_id, "title": body.title}


@router.get("/sessions/{session_id}/messages")
async def get_messages(session_id: str):
    messages = await get_session_messages(session_id)
    return {"messages": messages}


@router.delete("/sessions/{session_id}", status_code=204)
async def remove_session(session_id: str):
    await delete_session(session_id)
