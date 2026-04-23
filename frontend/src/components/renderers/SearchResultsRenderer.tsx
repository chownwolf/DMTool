import { useState } from 'react';
import type { SearchResult } from '../../types';

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

interface Props {
  query: string;
  results: SearchResult[];
}

export function SearchResultsRenderer({ query, results }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (results.length === 0) {
    return (
      <div style={{ color: '#5a3a1a', fontSize: '0.88rem', fontStyle: 'italic' }}>
        No results for "{query}"
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: '0.72rem', color: '#7a5a3a', marginBottom: 2 }}>
        {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
      </div>

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
              borderRadius: 5,
              padding: '8px 12px',
              cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
              <span
                style={{
                  background: typeColor,
                  borderRadius: 3,
                  padding: '2px 6px',
                  fontSize: '0.65rem',
                  color: '#e8d5a3',
                  flexShrink: 0,
                }}
              >
                {TYPE_LABELS[r.content_type] ?? r.content_type}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#c8a060', fontWeight: 600 }}>
                {r.book_name}
                {r.page_start > 0 ? ` p.${r.page_start}` : ''}
              </span>
              <span style={{ marginLeft: 'auto', color: '#3d2a14', fontSize: '0.75rem', flexShrink: 0 }}>
                {expanded ? '▲' : '▼'}
              </span>
            </div>

            {/* Section path */}
            {r.section_path && (
              <div style={{ fontSize: '0.72rem', color: '#5a3a1a', marginBottom: 4 }}>
                {r.section_path}
              </div>
            )}

            {/* Text */}
            <div
              style={{
                fontSize: '0.85rem',
                color: '#b09070',
                lineHeight: 1.6,
                ...(expanded
                  ? { whiteSpace: 'pre-wrap' }
                  : { overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }),
              }}
            >
              {r.text}
            </div>

            {/* Score */}
            <div style={{ marginTop: 4, fontSize: '0.65rem', color: '#3d2a14' }}>
              {r.score_type === 'vector' && r.distance !== undefined
                ? `semantic · dist ${r.distance.toFixed(3)}`
                : 'keyword match'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
