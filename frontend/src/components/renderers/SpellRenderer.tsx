import { PlainTextRenderer } from './PlainTextRenderer';

interface Props {
  content: string;
}

function parseSpell(text: string) {
  const lines = text.split('\n');
  const get = (label: string) => {
    const line = lines.find((l) => l.toLowerCase().startsWith(label.toLowerCase() + ':'));
    return line ? line.split(':').slice(1).join(':').trim() : null;
  };

  const nameLine = lines[0]?.trim() ?? '';
  const schoolLine = lines[1]?.trim() ?? '';

  const schoolMatch = schoolLine.match(/^(\w+)(?:\s*\(([^)]+)\))?(?:\s*\[([^\]]+)\])?/);

  return {
    name: nameLine,
    school: schoolMatch?.[1] ?? schoolLine,
    subschool: schoolMatch?.[2] ?? null,
    descriptor: schoolMatch?.[3] ?? null,
    level: get('Level') ?? '',
    components: get('Components') ?? '',
    castingTime: get('Casting Time') ?? '',
    range: get('Range') ?? '',
    target: get('Target') ?? get('Area') ?? get('Effect') ?? '',
    duration: get('Duration') ?? '',
    savingThrow: get('Saving Throw') ?? '',
    spellResistance: get('Spell Resistance') ?? '',
    description: lines.slice(lines.findIndex((l) => l.match(/^Spell Resistance:/i)) + 1).join('\n').trim(),
  };
}

const SCHOOL_COLORS: Record<string, string> = {
  Abjuration: '#2a4a6b',
  Conjuration: '#4b3a6b',
  Divination: '#6b4a2a',
  Enchantment: '#6b2a4a',
  Evocation: '#6b2a2a',
  Illusion: '#2a6b4b',
  Necromancy: '#1a1a3a',
  Transmutation: '#2a6b2a',
  Universal: '#4a4a2a',
};

export function SpellRenderer({ content }: Props) {
  const spell = parseSpell(content);

  if (!spell.name || !spell.level) {
    return <PlainTextRenderer content={content} />;
  }

  const color = SCHOOL_COLORS[spell.school] ?? '#2a3a4b';

  return (
    <div className="spell-entry my-2 max-w-2xl">
      <div className="spell-header" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
        <div style={{ fontFamily: 'Cinzel, Georgia, serif', fontWeight: 700, fontSize: '1.05rem' }}>
          {spell.name}
        </div>
        <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>
          {spell.school}
          {spell.subschool && ` (${spell.subschool})`}
          {spell.descriptor && ` [${spell.descriptor}]`}
        </div>
      </div>

      <div className="px-3 py-2 text-sm">
        {spell.level && <SpellField label="Level" value={spell.level} />}
        {spell.components && <SpellField label="Components" value={spell.components} />}
        {spell.castingTime && <SpellField label="Casting Time" value={spell.castingTime} />}
        {spell.range && <SpellField label="Range" value={spell.range} />}
        {spell.target && <SpellField label="Target/Area" value={spell.target} />}
        {spell.duration && <SpellField label="Duration" value={spell.duration} />}
        {spell.savingThrow && <SpellField label="Saving Throw" value={spell.savingThrow} />}
        {spell.spellResistance && <SpellField label="Spell Resistance" value={spell.spellResistance} />}
        {spell.description && (
          <div style={{ marginTop: 8, fontStyle: 'italic', color: '#2a1a0e', fontSize: '0.875rem', lineHeight: 1.5 }}>
            {spell.description}
          </div>
        )}
      </div>
    </div>
  );
}

function SpellField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
      <span style={{ fontWeight: 700, color: '#1a3a5a', minWidth: 110, fontSize: '0.8rem' }}>{label}:</span>
      <span style={{ flex: 1, fontSize: '0.85rem' }}>{value}</span>
    </div>
  );
}
