import { useRef, useState } from 'react';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    setTimeout(() => ref.current?.focus(), 0);
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        padding: '12px 16px',
        borderTop: '1px solid #3d2a14',
        background: '#1a0f0a',
      }}
    >
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
        placeholder="Ask the DM Tool... (Ctrl+Enter to send)"
        disabled={disabled}
        rows={2}
        style={{
          flex: 1,
          background: '#2a1a0e',
          border: '1px solid #5a3a1a',
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
          background: disabled || !value.trim() ? '#3d2a14' : '#7b1a1a',
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
        Ask
      </button>
    </div>
  );
}
