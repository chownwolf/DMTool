import { useEffect, useRef } from 'react';
import type { Message } from '../../types';
import { MessageBubble } from './MessageBubble';

interface Props {
  messages: Message[];
}

export function ChatWindow({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 12,
          color: '#5a3a1a',
        }}
      >
        <div style={{ fontSize: '3rem' }}>⚔</div>
        <div style={{ fontFamily: 'Cinzel, Georgia, serif', fontSize: '1.1rem', color: '#7a5a3a' }}>
          D&D 3.5 DM Tool
        </div>
        <div style={{ fontSize: '0.85rem', color: '#5a3a1a', textAlign: 'center', maxWidth: 300 }}>
          Upload your rulebooks in the sidebar, then ask anything about D&D 3.5 rules.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px',
      }}
    >
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
