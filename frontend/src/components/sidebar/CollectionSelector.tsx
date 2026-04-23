import type { Collection } from '../../types';

interface Props {
  collections: Collection[];
  selected: string | null;
  onChange: (collection: string | null) => void;
}

export function CollectionSelector({ collections, selected, onChange }: Props) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: '0.7rem', color: '#7a5a3a', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
        Collection
      </div>
      <select
        value={selected ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        style={{
          width: '100%',
          background: '#2a1a0e',
          border: '1px solid #3d2a14',
          borderRadius: 4,
          color: '#e8d5a3',
          padding: '5px 8px',
          fontSize: '0.8rem',
          fontFamily: 'Georgia, serif',
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        <option value="">All collections</option>
        {collections.map((c) => (
          <option key={c.name} value={c.name}>
            {c.name} ({c.document_count})
          </option>
        ))}
      </select>
    </div>
  );
}
