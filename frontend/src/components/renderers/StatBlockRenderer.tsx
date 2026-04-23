import { PlainTextRenderer } from './PlainTextRenderer';

interface Props {
  content: string;
}

function modStr(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function parseStatBlock(text: string) {
  const lines = text.split('\n');
  const get = (label: string) => {
    const line = lines.find((l) => l.toLowerCase().startsWith(label.toLowerCase() + ':'));
    return line ? line.split(':').slice(1).join(':').trim() : null;
  };

  const nameLine = lines[0]?.trim() ?? '';
  const typeLine = lines[1]?.trim() ?? '';

  const hitDice = get('Hit Dice') ?? '';
  const hpMatch = hitDice.match(/\((\d+)\s*hp\)/i);
  const hitPoints = hpMatch ? parseInt(hpMatch[1]) : 0;

  const abilitiesLine = get('Abilities') ?? '';
  const abilityMatch = abilitiesLine.match(
    /Str\s+(\d+),?\s+Dex\s+(\d+),?\s+Con\s+(\d+),?\s+Int\s+(\d+),?\s+Wis\s+(\d+),?\s+Cha\s+(\d+)/i,
  );
  const abilities = abilityMatch
    ? {
        str: parseInt(abilityMatch[1]),
        dex: parseInt(abilityMatch[2]),
        con: parseInt(abilityMatch[3]),
        int: parseInt(abilityMatch[4]),
        wis: parseInt(abilityMatch[5]),
        cha: parseInt(abilityMatch[6]),
      }
    : null;

  return {
    name: nameLine,
    typeLine,
    hitDice,
    hitPoints,
    initiative: get('Initiative') ?? '',
    speed: get('Speed') ?? '',
    armorClass: get('Armor Class') ?? '',
    baseAttack: get('Base Attack/Grapple') ?? '',
    attack: get('Attack') ?? '',
    fullAttack: get('Full Attack') ?? '',
    space: get('Space/Reach') ?? '',
    specialAttacks: get('Special Attacks') ?? '',
    specialQualities: get('Special Qualities') ?? '',
    saves: get('Saves') ?? '',
    abilities,
    skills: get('Skills') ?? '',
    feats: get('Feats') ?? '',
    cr: get('Challenge Rating') ?? '',
    alignment: get('Alignment') ?? '',
    advancement: get('Advancement'),
  };
}

export function StatBlockRenderer({ content }: Props) {
  const sb = parseStatBlock(content);

  if (!sb.name) {
    return <PlainTextRenderer content={content} />;
  }

  return (
    <div className="stat-block my-2 max-w-2xl">
      <div className="stat-block-header">
        <div style={{ fontFamily: 'Cinzel, Georgia, serif', fontWeight: 700, fontSize: '1.1rem' }}>
          {sb.name}
        </div>
        {sb.typeLine && (
          <div style={{ fontSize: '0.875rem', opacity: 0.85 }}>{sb.typeLine}</div>
        )}
      </div>

      <div className="px-3 py-2 text-sm">
        {sb.hitDice && <Field label="Hit Dice" value={sb.hitDice} />}
        {sb.initiative && <Field label="Initiative" value={sb.initiative} />}
        {sb.speed && <Field label="Speed" value={sb.speed} />}
        {sb.armorClass && <Field label="Armor Class" value={sb.armorClass} />}

        <hr className="stat-block-divider" />

        {sb.baseAttack && <Field label="Base Atk/Grapple" value={sb.baseAttack} />}
        {sb.attack && <Field label="Attack" value={sb.attack} />}
        {sb.fullAttack && <Field label="Full Attack" value={sb.fullAttack} />}
        {sb.space && <Field label="Space/Reach" value={sb.space} />}

        <hr className="stat-block-divider" />

        {sb.specialAttacks && <Field label="Special Attacks" value={sb.specialAttacks} />}
        {sb.specialQualities && <Field label="Special Qualities" value={sb.specialQualities} />}
        {sb.saves && <Field label="Saves" value={sb.saves} />}

        {sb.abilities && (
          <>
            <hr className="stat-block-divider" />
            <div style={{ fontWeight: 700, color: '#5a1212', fontSize: '0.8rem', marginBottom: 4 }}>
              ABILITIES
            </div>
            <div className="ability-grid" style={{ marginBottom: 6 }}>
              {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((ab) => (
                <div key={ab} className="ability-score">
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#5a1212' }}>
                    {ab.toUpperCase()}
                  </div>
                  <div style={{ fontWeight: 700 }}>{sb.abilities![ab]}</div>
                  <div style={{ fontSize: '0.75rem', color: '#4a3020' }}>
                    ({modStr(sb.abilities![ab])})
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <hr className="stat-block-divider" />

        {sb.skills && <Field label="Skills" value={sb.skills} />}
        {sb.feats && <Field label="Feats" value={sb.feats} />}

        <hr className="stat-block-divider" />

        {sb.cr && <Field label="Challenge Rating" value={sb.cr} />}
        {sb.alignment && <Field label="Alignment" value={sb.alignment} />}
        {sb.advancement && <Field label="Advancement" value={sb.advancement} />}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-block-field">
      <span className="stat-block-label" style={{ fontWeight: 700, color: '#5a1212', minWidth: 130, fontSize: '0.8rem' }}>
        {label}:
      </span>
      <span style={{ flex: 1, fontSize: '0.85rem' }}>{value}</span>
    </div>
  );
}
