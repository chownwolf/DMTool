import { useRef, useState } from 'react';
import { searchChunks, type SearchResult } from '../../api/client';

interface Props {
  collection: string | null;
}

const TYPE_COLORS: Record<string, string> = {
  stat_block: '#7b1a1a',
  spell:      '#1a3a5a',
  feat:       '#1a4a1a',
  rules_text: '#3a2a1a',
  table:      '#3a3a1a',
  flavor:     '#2a2a3a',
};

const TYPE_LABELS: Record<string, string> = {
  stat_block: 'Stat Block',
  spell:      'Spell',
  feat:       'Feat',
  rules_text: 'Rules',
  table:      'Table',
  flavor:     'Flavor',
};

export function SearchPanel({ collection }: Props) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'hybrid' | 'fts' | 'vector'>('hybrid');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function doSearch(q = query) {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await searchChunks(q.trim(), collection, mode);
      setResults(res);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Search input */}
      <div style={{ display: 'flex', gap: 4 }}>
        <input
          ref={inputRef}
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

      {/* Results */}
      {searched && !loading && results.length === 0 && (
        <div style={{ color: '#5a3a1a', fontSize: '0.78rem', fontStyle: 'italic' }}>
          No results found
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {results.map((r) => {
          const expanded = expandedId === r.chunk_id;
          const typeColor = TYPE_COLORS[r.content_type] ?? '#3a2a1a';
          return (
            <div
              key={r.chunk_id}
              onClick={() => setExpandedId(expanded ? null : r.chunk_id)}
              style={{
                background: '#1e1208',
                border: `1px solid ${expanded ? '#7b3a1a' : '#2a1a0e'}`,
                borderRadius: 4,
                padding: '6px 8px',
                cursor: 'pointer',
              }}
            >
              {/* Header row */}
              <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 3 }}>
                <span
                  style={{
                    background: typeColor,
                    borderRadius: 3,
                    padding: '1px 5px',
                    fontSize: '0.6rem',
                    color: '#e8d5a3',
                    flexShrink: 0,
                  }}
                >
                  {TYPE_LABELS[r.content_type] ?? r.content_type}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#c8a060', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.book_name}
                  {r.page_start > 0 ? ` p.${r.page_start}` : ''}
                </span>
                <span style={{ marginLeft: 'auto', color: '#3d2a14', fontSize: '0.7rem', flexShrink: 0 }}>
                  {expanded ? '▲' : '▼'}
                </span>
              </div>

              {/* Section path */}
              {r.section_path && (
                <div style={{ fontSize: '0.65rem', color: '#5a3a1a', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.section_path}
                </div>
              )}

              {/* Text preview / full */}
              <div
                style={{
                  fontSize: '0.75rem',
                  color: '#a08060',
                  lineHeight: 1.5,
                  ...(expanded ? {} : { overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }),
                }}
              >
                {r.text}
              </div>

              {/* Score badge */}
              <div style={{ marginTop: 3, fontSize: '0.6rem', color: '#3d2a14' }}>
                {r.score_type === 'vector' && r.distance !== undefined
                  ? `semantic · dist ${r.distance}`
                  : 'keyword match'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
