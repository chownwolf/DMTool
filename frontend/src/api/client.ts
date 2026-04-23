import type { Collection, DocumentRecord, DocumentStatus } from '../types';

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
