import { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Citation, ContentType, Message } from '../types';
import { isDiceCommand, rollDice } from '../utils/dice';
import { useStream } from './useStream';

interface UseChatOptions {
  collection: string | null;
  sessionId: string | null;
  onNeedSession: (firstMessage: string) => Promise<string>;
  onSessionUpdated: () => void;
}

export function useChat({ collection, sessionId, onNeedSession, onSessionUpdated }: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const { startStream, cancel } = useStream();

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      // Intercept dice commands — handle locally, no LLM call
      const { isRoll, notation } = isDiceCommand(text);
      if (isRoll) {
        const result = rollDice(notation);
        const diceMsg: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: notation,
          contentType: 'dice_roll',
          citations: [],
          diceRoll: result ?? undefined,
        };
        setMessages((prev) => [...prev, diceMsg]);
        return;
      }

      // Create session on first message if none active
      let sid = sessionId;
      if (!sid) {
        sid = await onNeedSession(text);
      }

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

      const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));

      await startStream(text, collection, history, sid, {
        onChunk: (chunk) =>
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
          ),
        onContentType: (type) =>
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, contentType: type as ContentType } : m)),
          ),
        onCitations: (citations) =>
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, citations: citations as Citation[] } : m)),
          ),
        onDone: () => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m)),
          );
          setIsStreaming(false);
          onSessionUpdated();
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
    [messages, isStreaming, collection, sessionId, onNeedSession, onSessionUpdated, startStream],
  );

  function pushMessage(msg: Message) {
    setMessages((prev) => [...prev, msg]);
  }

  function loadMessages(msgs: Message[]) {
    cancel();
    setMessages(msgs);
    setIsStreaming(false);
  }

  function clearMessages() {
    cancel();
    setMessages([]);
    setIsStreaming(false);
  }

  return { messages, isStreaming, sendMessage, pushMessage, loadMessages, clearMessages };
}
