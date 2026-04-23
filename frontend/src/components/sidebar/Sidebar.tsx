import { useEffect, useState } from 'react';
import { fetchCollections } from '../../api/client';
import type { Session } from '../../api/client';
import type { Collection } from '../../types';
import { useDocuments } from '../../hooks/useDocuments';
import { CollectionSelector } from './CollectionSelector';
import { DocumentList } from './DocumentList';
import { SearchPanel } from './SearchPanel';
import { SessionList } from './SessionList';
import { UploadDropzone } from './UploadDropzone';

interface Props {
  selectedCollection: string | null;
  onCollectionChange: (c: string | null) => void;
  onClearChat: () => void;
  sessions: Session[];
  activeSessionId: string | null;
  onLoadSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onNewSession: () => void;
}

type Panel = 'chat' | 'books' | 'search';

export function Sidebar({
  selectedCollection, onCollectionChange, onClearChat,
  sessions, activeSessionId, onLoadSession, onDeleteSession, onNewSession,
}: Props) {
  const { documents, progressMap, loading, upload, remove } = useDocuments();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [panel, setPanel] = useState<Panel>('chat');

  useEffect(() => {
    fetchCollections().then(setCollections);
  }, [documents]);

  return (
    <div style={{ width: 240, minWidth: 240, background: '#150d07', borderRight: '1px solid #3d2a14', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #3d2a14', background: '#1a0f0a' }}>
        <div style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#f5d5a0', fontWeight: 700, fontSize: '1rem' }}>
          ⚔ DM Tool
        </div>
        <div style={{ fontSize: '0.7rem', color: '#7a5a3a' }}>D&D 3.5 Edition</div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #3d2a14' }}>
        {(['chat', 'search', 'books'] as Panel[]).map((p) => (
          <button
            key={p}
            onClick={() => setPanel(p)}
            style={{
              flex: 1,
              background: panel === p ? '#2a1a0e' : 'transparent',
              border: 'none',
              borderBottom: panel === p ? '2px solid #9b4a1b' : '2px solid transparent',
              color: panel === p ? '#f5d5a0' : '#7a5a3a',
              padding: '7px 0',
              cursor: 'pointer',
              fontSize: '0.65rem',
              fontFamily: 'Cinzel, Georgia, serif',
            }}
          >
            {p === 'chat' ? 'Sessions' : p === 'search' ? 'Search' : 'Books'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        {panel === 'chat' && (
          <SessionList
            sessions={sessions}
            activeSessionId={activeSessionId}
            onLoad={onLoadSession}
            onDelete={onDeleteSession}
            onNew={onNewSession}
          />
        )}
        {panel === 'search' && (
          <SearchPanel collection={selectedCollection} />
        )}
        {panel === 'books' && (
          <>
            <CollectionSelector collections={collections} selected={selectedCollection} onChange={onCollectionChange} />
            <SectionLabel>Add Books</SectionLabel>
            <UploadDropzone onUpload={upload} loading={loading} />
            <SectionLabel style={{ marginTop: 16 }}>Books</SectionLabel>
            <DocumentList documents={documents} progressMap={progressMap} onDelete={remove} />
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid #3d2a14' }}>
        <button
          onClick={onClearChat}
          style={{ width: '100%', background: 'none', border: '1px solid #3d2a14', borderRadius: 4, color: '#7a5a3a', padding: '5px 0', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'Georgia, serif' }}
        >
          New Chat
        </button>
      </div>
    </div>
  );
}

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ fontSize: '0.7rem', color: '#7a5a3a', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1, ...style }}>
      {children}
    </div>
  );
}
