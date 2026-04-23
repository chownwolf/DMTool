import { QUICK_DICE } from '../../utils/dice';

interface Props {
  onRoll: (notation: string) => void;
}

export function DiceStrip({ onRoll }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 5,
        padding: '6px 16px',
        borderTop: '1px solid #2a1a0e',
        background: '#150d07',
        flexWrap: 'wrap',
      }}
    >
      {QUICK_DICE.map((sides) => (
        <button
          key={sides}
          onClick={() => onRoll(`1d${sides}`)}
          title={`Roll 1d${sides}`}
          style={{
            background: '#2a1a0e',
            border: '1px solid #5a3a1a',
            borderRadius: 4,
            color: '#c8a060',
            padding: '3px 7px',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontFamily: 'Cinzel, Georgia, serif',
            transition: 'background 0.1s',
          }}
          onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.background = '#3d2a14')}
          onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.background = '#2a1a0e')}
        >
          d{sides}
        </button>
      ))}
      <div style={{ color: '#3d2a14', fontSize: '0.7rem', alignSelf: 'center', marginLeft: 4 }}>
        or type /roll 2d6+3
      </div>
    </div>
  );
}
