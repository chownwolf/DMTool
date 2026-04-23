import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface Props {
  onUpload: (file: File, bookName: string, collection: string) => Promise<void>;
  loading: boolean;
}

export function UploadDropzone({ onUpload, loading }: Props) {
  const [bookName, setBookName] = useState('');
  const [collection, setCollection] = useState('default');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setSelectedFile(accepted[0]);
      setError('');
      if (!bookName) {
        setBookName(accepted[0].name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
      }
    }
  }, [bookName]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    multiple: false,
    disabled: loading,
  });

  async function handleUpload() {
    if (!selectedFile || !bookName.trim()) {
      setError('Select a file and enter a book name');
      return;
    }
    try {
      await onUpload(selectedFile, bookName.trim(), collection.trim() || 'default');
      setSelectedFile(null);
      setBookName('');
      setError('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    }
  }

  return (
    <div style={{ padding: '8px 0' }}>
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? '#9b4a1b' : '#3d2a14'}`,
          borderRadius: 6,
          padding: '12px 8px',
          textAlign: 'center',
          cursor: loading ? 'not-allowed' : 'pointer',
          background: isDragActive ? '#2a1a0e' : 'transparent',
          transition: 'all 0.15s',
          fontSize: '0.8rem',
          color: '#7a5a3a',
        }}
      >
        <input {...getInputProps()} />
        {selectedFile ? (
          <div style={{ color: '#c8a060' }}>📄 {selectedFile.name}</div>
        ) : (
          <div>{isDragActive ? 'Drop here…' : '+ Drop PDF or DOCX'}</div>
        )}
      </div>

      {selectedFile && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input
            value={bookName}
            onChange={(e) => setBookName(e.target.value)}
            placeholder="Book name (e.g. Player's Handbook)"
            style={inputStyle}
          />
          <input
            value={collection}
            onChange={(e) => setCollection(e.target.value)}
            placeholder="Collection (default)"
            style={inputStyle}
          />
          {error && <div style={{ color: '#c04040', fontSize: '0.75rem' }}>{error}</div>}
          <button
            onClick={handleUpload}
            disabled={loading}
            style={{
              background: loading ? '#3d2a14' : '#7b1a1a',
              border: 'none',
              borderRadius: 4,
              color: '#f5d5a0',
              padding: '6px 0',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.8rem',
              fontFamily: 'Cinzel, Georgia, serif',
            }}
          >
            {loading ? 'Uploading…' : 'Upload & Index'}
          </button>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: '#2a1a0e',
  border: '1px solid #3d2a14',
  borderRadius: 4,
  color: '#e8d5a3',
  padding: '5px 8px',
  fontSize: '0.8rem',
  fontFamily: 'Georgia, serif',
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
};
