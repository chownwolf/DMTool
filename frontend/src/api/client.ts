import type { Collection, DocumentRecord, DocumentStatus, SearchResult } from '../types';

const BASE = '/api';

export async function fetchDocuments(): Promise<DocumentRecord[]> {
  const res = await fetch(`${BASE}/documents`);
  const data = await res.json();
  return data.documents;
}

export async function fetchDocumentStatus(id: string): Promise<DocumentStatus> {
  const res = await fetch(`${BASE}/documents/${id}/status`);
  return res.json();
}

export async function uploadDocument(
  file: File,
  bookName: string,
  collection: string,
): Promise<{ document_id: string; status: string }> {
  const form = new FormData();
  form.append('file', file);
  form.append('book_name', bookName);
  form.append('collection', collection);
  const res = await fetch(`${BASE}/documents/upload`, { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Upload failed');
  }
  return res.json();
}

export async function deleteDocument(id: string): Promise<void> {
  await fetch(`${BASE}/documents/${id}`, { method: 'DELETE' });
}

export async function fetchCollections(): Promise<Collection[]> {
  const res = await fetch(`${BASE}/collections`);
  const data = await res.json();
  return data.collections;
}

export async function fetchHealth(): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}/health`);
  return res.json();
}

// Sessions
export async function fetchSessions(): Promise<Session[]> {
  const res = await fetch(`${BASE}/sessions`);
  const data = await res.json();
  return data.sessions;
}

export async function createSession(title: string, collection: string | null): Promise<{ id: string; title: string }> {
  const res = await fetch(`${BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, collection }),
  });
  return res.json();
}

export async function fetchSessionMessages(sessionId: string): Promise<SavedMessage[]> {
  const res = await fetch(`${BASE}/sessions/${sessionId}/messages`);
  const data = await res.json();
  return data.messages;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await fetch(`${BASE}/sessions/${sessionId}`, { method: 'DELETE' });
}

export interface Session {
  id: string;
  title: string;
  collection: string | null;
  created_at: string;
  updated_at: string;
}

export async function searchChunks(
  q: string,
  collection: string | null,
  mode: 'fts' | 'vector' | 'hybrid' = 'hybrid',
  limit = 20,
): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q, mode, limit: String(limit) });
  if (collection) params.set('collection', collection);
  const res = await fetch(`${BASE}/search?${params}`);
  const data = await res.json();
  return data.results ?? [];
}

export type { SearchResult };

export interface SavedMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  content_type: string;
  citations: unknown[];
  created_at: string;
}
