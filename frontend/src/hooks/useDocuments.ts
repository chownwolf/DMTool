import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteDocument, fetchDocuments, uploadDocument } from '../api/client';
import type { DocumentRecord } from '../types';

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    const docs = await fetchDocuments();
    setDocuments(docs);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll documents that are still processing
  useEffect(() => {
    const processing = documents.filter(
      (d) => d.status === 'queued' || d.status === 'processing',
    );
    if (processing.length > 0) {
      pollingRef.current = setInterval(refresh, 2000);
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [documents, refresh]);

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

  const remove = useCallback(
    async (id: string) => {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    },
    [],
  );

  return { documents, loading, upload, remove, refresh };
}
