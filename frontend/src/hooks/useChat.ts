import { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Citation, ContentType, Message } from '../types';
import { useStream } from './useStream';

export function useChat(collection: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const { startStream, cancel } = useStream();

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMsg: Message = {
        id: uuidv4(),
        role: 'user',
        content: text,
        contentType: 'rules_text',
        citations: [],
      };

      const assistantId = uuidv4();
      const assistantMsg: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        contentType: 'rules_text',
        citations: [],
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      await startStream(text, collection, history, {
        onChunk: (chunk) =>
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
          ),
        onContentType: (type) =>
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, contentType: type as ContentType } : m,
            ),
          ),
        onCitations: (citations) =>
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, citations: citations as Citation[] } : m,
            ),
          ),
        onDone: () => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m)),
          );
          setIsStreaming(false);
        },
        onError: (err) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content + `\n\n[Error: ${err}]`, isStreaming: false }
                : m,
            ),
          );
          setIsStreaming(false);
        },
      });
    },
    [messages, isStreaming, collection, startStream],
  );

  function clearChat() {
    cancel();
    setMessages([]);
    setIsStreaming(false);
  }

  return { messages, isStreaming, sendMessage, clearChat };
}
