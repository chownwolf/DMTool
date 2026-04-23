import type { Session } from '../../api/client';

interface Props {
  sessions: Session[];
  activeSessionId: string | null;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

export function SessionList({ sessions, activeSessionId, onLoad, onDelete, onNew }: Props) {
  return (
    <div>
      <button
        onClick={onNew}
        style={{
          width: '100%',
          background: '#2a1a0e',
          border: '1px solid #5a3a1a',
          borderRadius: 4,
          color: '#c8a060',
          padding: '5px 0',
          cursor: 'pointer',
          fontSize: '0.78rem',
          fontFamily: 'Cinzel, Georgia, serif',
          marginBottom: 6,
        }}
      >
        + New Session
      </button>

      {sessions.length === 0 && (
        <div style={{ color: '#5a3a1a', fontSize: '0.75rem', fontStyle: 'italic' }}>
          No saved sessions
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {sessions.map((s) => (
          <div
            key={s.id}
            onClick={() => onLoad(s.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '5px 8px',
              borderRadius: 4,
              cursor: 'pointer',
              background: activeSessionId === s.id ? '#3d2a14' : 'transparent',
              border: `1px solid ${activeSessionId === s.id ? '#7b3a1a' : 'transparent'}`,
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => {
              if (activeSessionId !== s.id)
                (e.currentTarget as HTMLDivElement).style.background = '#2a1a0e';
            }}
            onMouseLeave={(e) => {
              if (activeSessionId !== s.id)
                (e.currentTarget as HTMLDivElement).style.background = 'transparent';
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: activeSessionId === s.id ? '#f5d5a0' : '#a08060',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {s.title}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#5a3a1a' }}>
                {new Date(s.updated_at).toLocaleDateString()}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#5a3a1a',
                cursor: 'pointer',
                padding: '0 2px',
                fontSize: '0.85rem',
                flexShrink: 0,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
