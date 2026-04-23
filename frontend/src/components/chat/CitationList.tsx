import { useState } from 'react';
import type { Citation } from '../../types';

interface Props {
  citations: Citation[];
}

export function CitationList({ citations }: Props) {
  const [open, setOpen] = useState(false);
  if (citations.length === 0) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: 'none',
          border: '1px solid #5a3a1a',
          color: '#a08060',
          borderRadius: 4,
          padding: '2px 8px',
          fontSize: '0.75rem',
          cursor: 'pointer',
          fontFamily: 'Georgia, serif',
        }}
      >
        {open ? '▲' : '▼'} {citations.length} source{citations.length > 1 ? 's' : ''}
      </button>

      {open && (
        <div style={{ marginTop: 4 }}>
          {citations.map((c, i) => (
            <div
              key={i}
              style={{
                fontSize: '0.75rem',
                color: '#a08060',
                fontStyle: 'italic',
                padding: '2px 0',
              }}
            >
              {c.book}{c.page > 0 ? `, p.${c.page}` : ''}
              {c.section ? ` — ${c.section}` : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
