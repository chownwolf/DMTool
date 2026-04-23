import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteDocument, fetchDocumentStatus, fetchDocuments, uploadDocument } from '../api/client';
import type { DocumentRecord, DocumentStatus } from '../types';

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, DocumentStatus>>({});
  const [loading, setLoading] = useState(false);
  const listPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    const docs = await fetchDocuments();
    setDocuments(docs);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll list every 3s while any doc is active
  useEffect(() => {
    const active = documents.filter((d) => d.status === 'queued' || d.status === 'processing');

    if (active.length > 0) {
      listPollRef.current = setInterval(refresh, 3000);
    } else {
      clearInterval(listPollRef.current ?? undefined);
      listPollRef.current = null;
    }

    return () => clearInterval(listPollRef.current ?? undefined);
  }, [documents, refresh]);

  // Poll per-doc status every 1.5s for richer progress info
  useEffect(() => {
    const active = documents.filter((d) => d.status === 'queued' || d.status === 'processing');

    if (active.length === 0) {
      clearInterval(statusPollRef.current ?? undefined);
      statusPollRef.current = null;
      return;
    }

    async function pollStatuses() {
      const updates = await Promise.all(
        active.map((d) => fetchDocumentStatus(d.id).catch(() => null)),
      );
      setProgressMap((prev) => {
        const next = { ...prev };
        updates.forEach((s) => {
          if (s) next[s.document_id] = s;
        });
        return next;
      });
    }

    pollStatuses();
    statusPollRef.current = setInterval(pollStatuses, 1500);
    return () => clearInterval(statusPollRef.current ?? undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents]);

  const upload = useCallback(
    async (file: File, bookName: string, collection: string) => {
      setLoading(true);
      try {
        await uploadDocument(file, bookName, collection);
        await refresh();
      } finally {
        setLoading(false);
      }
    },
    [refresh],
  );

  const remove = useCallback(async (id: string) => {
    await deleteDocument(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    setProgressMap((prev) => { const n = { ...prev }; delete n[id]; return n; });
  }, []);

  return { documents, progressMap, loading, upload, remove, refresh };
}
