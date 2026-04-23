import { useRef, useState } from 'react';
import type { ChatMode } from '../../hooks/useChat';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  mode: ChatMode;
  onModeChange: (m: ChatMode) => void;
}

export function ChatInput({ onSend, disabled, mode, onModeChange }: Props) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    setTimeout(() => ref.current?.focus(), 0);
  }

  const isSearch = mode === 'search';

  return (
    <div style={{ borderTop: '1px solid #3d2a14', background: '#1a0f0a' }}>
      {/* Mode toggle bar */}
      <div style={{ display: 'flex', gap: 4, padding: '6px 16px 0' }}>
        {(['ai', 'search'] as ChatMode[]).map((m) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            style={{
              background: mode === m ? (m === 'search' ? '#1a3a5a' : '#4a1010') : 'transparent',
              border: `1px solid ${mode === m ? (m === 'search' ? '#2a5a8a' : '#7b1a1a') : '#2a1a0e'}`,
              borderRadius: 4,
              color: mode === m ? '#f5d5a0' : '#5a3a1a',
              padding: '3px 10px',
              cursor: 'pointer',
              fontSize: '0.7rem',
              fontFamily: 'Cinzel, Georgia, serif',
            }}
          >
            {m === 'ai' ? '⚔ AI' : '🔍 Lookup'}
          </button>
        ))}
        {isSearch && (
          <span style={{ fontSize: '0.65rem', color: '#3a5a7a', alignSelf: 'center', marginLeft: 4 }}>
            returns raw book chunks · no LLM
          </span>
        )}
      </div>

      {/* Input row */}
      <div style={{ display: 'flex', gap: 8, padding: '8px 16px 12px' }}>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={isSearch
            ? 'Search indexed books… (Ctrl+Enter)'
            : 'Ask the DM Tool… (Ctrl+Enter to send)'}
          disabled={disabled}
          rows={2}
          style={{
            flex: 1,
            background: '#2a1a0e',
            border: `1px solid ${isSearch ? '#2a4a6a' : '#5a3a1a'}`,
            borderRadius: 6,
            color: '#e8d5a3',
            padding: '8px 12px',
            fontSize: '0.9rem',
            fontFamily: 'Georgia, serif',
            resize: 'none',
            outline: 'none',
            opacity: disabled ? 0.6 : 1,
          }}
        />
        <button
          onClick={submit}
          disabled={disabled || !value.trim()}
          style={{
            background: disabled || !value.trim()
              ? '#3d2a14'
              : isSearch ? '#1a3a5a' : '#7b1a1a',
            border: 'none',
            borderRadius: 6,
            color: '#f5d5a0',
            padding: '0 16px',
            cursor: disabled || !value.trim() ? 'not-allowed' : 'pointer',
            fontFamily: 'Cinzel, Georgia, serif',
            fontSize: '0.85rem',
            transition: 'background 0.15s',
          }}
        >
          {isSearch ? 'Find' : 'Ask'}
        </button>
      </div>
    </div>
  );
}
