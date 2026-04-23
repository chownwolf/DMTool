import { useCallback, useEffect, useState } from 'react';
import {
  createSession,
  deleteSession,
  fetchSessionMessages,
  fetchSessions,
  type Session,
  type SavedMessage,
} from '../api/client';
import type { Citation, ContentType, Message } from '../types';

const ACTIVE_SESSION_KEY = 'dmtool_active_session';

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_SESSION_KEY),
  );

  const refresh = useCallback(async () => {
    const s = await fetchSessions();
    setSessions(s);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const startSession = useCallback(
    async (firstMessage: string, collection: string | null): Promise<string> => {
      const title = firstMessage.slice(0, 60) + (firstMessage.length > 60 ? '…' : '');
      const { id } = await createSession(title, collection);
      setActiveSessionId(id);
      localStorage.setItem(ACTIVE_SESSION_KEY, id);
      await refresh();
      return id;
    },
    [refresh],
  );

  const loadSession = useCallback(
    async (sessionId: string): Promise<Message[]> => {
      const raw: SavedMessage[] = await fetchSessionMessages(sessionId);
      setActiveSessionId(sessionId);
      localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
      return raw.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        contentType: m.content_type as ContentType,
        citations: m.citations as Citation[],
        isStreaming: false,
      }));
    },
    [],
  );

  const removeSession = useCallback(
    async (sessionId: string) => {
      await deleteSession(sessionId);
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        localStorage.removeItem(ACTIVE_SESSION_KEY);
      }
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    },
    [activeSessionId],
  );

  const clearActive = useCallback(() => {
    setActiveSessionId(null);
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  }, []);

  return { sessions, activeSessionId, startSession, loadSession, removeSession, clearActive, refresh };
}
