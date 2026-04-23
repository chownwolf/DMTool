import type { DocumentRecord } from '../../types';

interface Props {
  documents: DocumentRecord[];
  onDelete: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  queued: '#7a5a1a',
  processing: '#1a5a7a',
  indexed: '#1a7a3a',
  error: '#7a1a1a',
};

const STATUS_LABELS: Record<string, string> = {
  queued: '⏳ Queued',
  processing: '⚙ Processing',
  indexed: '✓ Indexed',
  error: '✗ Error',
};

export function DocumentList({ documents, onDelete }: Props) {
  if (documents.length === 0) {
    return (
      <div style={{ color: '#5a3a1a', fontSize: '0.8rem', fontStyle: 'italic', padding: '4px 0' }}>
        No documents yet
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {documents.map((doc) => (
        <div
          key={doc.id}
          style={{
            background: '#2a1a0e',
            border: '1px solid #3d2a14',
            borderRadius: 4,
            padding: '6px 8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', color: '#c8a060', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {doc.book_name}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#7a5a3a' }}>{doc.filename}</div>
              <div style={{ marginTop: 3, display: 'flex', gap: 6, alignItems: 'center' }}>
                <span
                  style={{
                    background: STATUS_COLORS[doc.status] + '33',
                    border: `1px solid ${STATUS_COLORS[doc.status]}`,
                    borderRadius: 3,
                    padding: '1px 5px',
                    fontSize: '0.65rem',
                    color: '#e8d5a3',
                  }}
                >
                  {STATUS_LABELS[doc.status] ?? doc.status}
                </span>
                {doc.status === 'indexed' && doc.chunk_count > 0 && (
                  <span style={{ fontSize: '0.65rem', color: '#5a3a1a' }}>
                    {doc.chunk_count} chunks
                  </span>
                )}
              </div>
              {doc.error_message && (
                <div style={{ fontSize: '0.65rem', color: '#c04040', marginTop: 2 }}>
                  {doc.error_message}
                </div>
              )}
            </div>
            <button
              onClick={() => onDelete(doc.id)}
              title="Remove document"
              style={{
                background: 'none',
                border: 'none',
                color: '#5a3a1a',
                cursor: 'pointer',
                padding: '0 4px',
                fontSize: '0.85rem',
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
