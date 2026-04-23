import { PlainTextRenderer } from './PlainTextRenderer';

interface Props {
  content: string;
}

function parseFeat(text: string) {
  const lines = text.split('\n');
  const get = (label: string) => {
    const line = lines.find((l) => l.toLowerCase().startsWith(label.toLowerCase() + ':'));
    return line ? line.split(':').slice(1).join(':').trim() : null;
  };

  const nameLine = lines[0]?.trim() ?? '';
  const typeMatch = text.match(/\[([\w\s]+Feat)\]/i);

  return {
    name: nameLine.replace(/\[.*?\]/g, '').trim(),
    featType: typeMatch?.[1] ?? 'General',
    prerequisites: get('Prerequisite') ?? get('Prerequisites') ?? '',
    benefit: get('Benefit') ?? '',
    normal: get('Normal'),
    special: get('Special'),
  };
}

export function FeatRenderer({ content }: Props) {
  const feat = parseFeat(content);

  if (!feat.name || !feat.benefit) {
    return <PlainTextRenderer content={content} />;
  }

  return (
    <div className="feat-entry my-2 max-w-2xl">
      <div className="feat-header">
        <div style={{ fontFamily: 'Cinzel, Georgia, serif', fontWeight: 700, fontSize: '1.05rem' }}>
          {feat.name}
        </div>
        <div style={{ fontSize: '0.78rem', opacity: 0.8 }}>[{feat.featType}]</div>
      </div>

      <div className="px-3 py-2 text-sm">
        {feat.prerequisites && (
          <FeatField label="Prerequisites" value={feat.prerequisites} />
        )}
        {feat.benefit && <FeatField label="Benefit" value={feat.benefit} />}
        {feat.normal && <FeatField label="Normal" value={feat.normal} />}
        {feat.special && <FeatField label="Special" value={feat.special} />}
      </div>
    </div>
  );
}

function FeatField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <span style={{ fontWeight: 700, color: '#1a3a1a', fontSize: '0.8rem' }}>{label}: </span>
      <span style={{ fontSize: '0.875rem' }}>{value}</span>
    </div>
  );
}
