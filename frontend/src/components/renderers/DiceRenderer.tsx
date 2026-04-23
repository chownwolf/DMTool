import type { DiceRollResult } from '../../utils/dice';

interface Props {
  result: DiceRollResult;
}

const DIE_COLORS: Record<number, string> = {
  4:   '#8b5e3c',
  6:   '#7b3a1a',
  8:   '#3a5a7b',
  10:  '#3a7b5a',
  12:  '#5a3a7b',
  20:  '#7b1a1a',
  100: '#4a4a2a',
};

export function DiceRenderer({ result }: Props) {
  const { groups, modifier, total, notation, isNat20, isNat1 } = result;
  const group = groups[0];
  const color = DIE_COLORS[group.sides] ?? '#5a3a1a';

  const glowStyle = isNat20
    ? { boxShadow: '0 0 12px 3px rgba(255, 215, 0, 0.7)', border: '2px solid #ffd700' }
    : isNat1
    ? { boxShadow: '0 0 12px 3px rgba(180, 30, 30, 0.7)', border: '2px solid #c03030' }
    : { border: `2px solid ${color}` };

  return (
    <div
      style={{
        background: '#1e1208',
        borderRadius: 8,
        padding: '10px 14px',
        maxWidth: 340,
        ...glowStyle,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: '1.1rem' }}>🎲</span>
        <span style={{ fontFamily: 'Cinzel, Georgia, serif', fontSize: '0.85rem', color: '#a08060' }}>
          {notation}
        </span>
        {isNat20 && <span style={{ color: '#ffd700', fontSize: '0.75rem', fontWeight: 700 }}>NATURAL 20!</span>}
        {isNat1 && <span style={{ color: '#c03030', fontSize: '0.75rem', fontWeight: 700 }}>NAT 1</span>}
      </div>

      {/* Individual dice */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
        {group.rolls.map((v, i) => {
          const dropped = group.dropped.includes(i);
          return (
            <div
              key={i}
              style={{
                width: 32,
                height: 32,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: dropped ? '#1a1208' : color,
                color: dropped ? '#4a3a2a' : '#f5d5a0',
                fontWeight: 700,
                fontSize: '0.85rem',
                textDecoration: dropped ? 'line-through' : 'none',
                opacity: dropped ? 0.4 : 1,
                border: `1px solid ${dropped ? '#2a1a0e' : color}`,
              }}
            >
              {v}
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        {modifier !== 0 && (
          <span style={{ fontSize: '0.8rem', color: '#a08060' }}>
            {group.rolls.filter((_, i) => !group.dropped.includes(i)).reduce((a, b) => a + b, 0)}
            {modifier > 0 ? ` + ${modifier}` : ` − ${Math.abs(modifier)}`} =
          </span>
        )}
        <span
          style={{
            fontSize: '1.6rem',
            fontWeight: 700,
            fontFamily: 'Cinzel, Georgia, serif',
            color: isNat20 ? '#ffd700' : isNat1 ? '#c03030' : '#f5d5a0',
          }}
        >
          {total}
        </span>
      </div>
    </div>
  );
}
