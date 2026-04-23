import { useRef } from 'react';

interface StreamCallbacks {
  onChunk: (text: string) => void;
  onContentType: (type: string) => void;
  onCitations: (citations: unknown[]) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}

export function useStream() {
  const abortRef = useRef<AbortController | null>(null);

  async function startStream(
    message: string,
    collection: string | null,
    history: Array<{ role: string; content: string }>,
    callbacks: StreamCallbacks,
  ) {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, collection, history }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        callbacks.onError('Server error');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (!json) continue;
          try {
            const event = JSON.parse(json);
            switch (event.type) {
              case 'chunk':
                callbacks.onChunk(event.text ?? '');
                break;
              case 'content_type':
                callbacks.onContentType(event.detected ?? 'rules_text');
                break;
              case 'citations':
                callbacks.onCitations(event.citations ?? []);
                break;
              case 'done':
                callbacks.onDone();
                break;
              case 'error':
                callbacks.onError(event.message ?? 'Unknown error');
                break;
            }
          } catch {
            // malformed SSE line, ignore
          }
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        callbacks.onError(e.message);
      }
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  return { startStream, cancel };
}
