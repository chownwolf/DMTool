import { useState } from 'react';
import { searchChunks } from '../../api/client';
import type { SearchResult } from '../../types';

interface Props {
  collection: string | null;
  onResults: (query: string, mode: 'hybrid' | 'fts' | 'vector', results: SearchResult[]) => void;
}

export function SearchPanel({ collection, onResults }: Props) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'hybrid' | 'fts' | 'vector'>('hybrid');
  const [loading, setLoading] = useState(false);

  async function doSearch(q = query) {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await searchChunks(q.trim(), collection, mode);
      onResults(q.trim(), mode, res);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: '0.7rem', color: '#5a3a1a', fontStyle: 'italic' }}>
        Results appear in chat window
      </div>

      {/* Search input */}
      <div style={{ display: 'flex', gap: 4 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && doSearch()}
          placeholder="Search indexed content…"
          style={{
            flex: 1,
            background: '#2a1a0e',
            border: '1px solid #3d2a14',
            borderRadius: 4,
            color: '#e8d5a3',
            padding: '5px 8px',
            fontSize: '0.78rem',
            fontFamily: 'Georgia, serif',
            outline: 'none',
          }}
        />
        <button
          onClick={() => doSearch()}
          disabled={loading || !query.trim()}
          style={{
            background: loading ? '#2a1a0e' : '#7b1a1a',
            border: 'none',
            borderRadius: 4,
            color: '#f5d5a0',
            padding: '0 10px',
            cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
            fontSize: '0.78rem',
            fontFamily: 'Cinzel, Georgia, serif',
          }}
        >
          {loading ? '…' : 'Go'}
        </button>
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 3 }}>
        {(['hybrid', 'fts', 'vector'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              flex: 1,
              background: mode === m ? '#3d2a14' : 'transparent',
              border: `1px solid ${mode === m ? '#7b3a1a' : '#2a1a0e'}`,
              borderRadius: 3,
              color: mode === m ? '#f5d5a0' : '#5a3a1a',
              padding: '3px 0',
              cursor: 'pointer',
              fontSize: '0.65rem',
              textTransform: 'capitalize',
            }}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}
