export interface DieResult {
  sides: number;
  rolls: number[];
  dropped: number[];  // indices of dropped dice
}

export interface DiceRollResult {
  notation: string;
  groups: DieResult[];
  modifier: number;
  total: number;
  isNat20: boolean;
  isNat1: boolean;
}

const DICE_RE = /^(\d+)?d(\d+)(dl|dh|kl|kh)?([+-]\d+)?$/i;

/** Parse and roll a dice expression like "2d6+3", "4d6dl", "d20", "1d20-2" */
export function rollDice(notation: string): DiceRollResult | null {
  const clean = notation.trim().toLowerCase().replace(/\s+/g, '');
  const match = clean.match(DICE_RE);
  if (!match) return null;

  const count = parseInt(match[1] ?? '1', 10);
  const sides = parseInt(match[2], 10);
  const dropMod = match[3] ?? null;   // dl = drop lowest, dh = drop highest
  const modStr = match[4] ?? null;
  const modifier = modStr ? parseInt(modStr, 10) : 0;

  if (count < 1 || count > 100 || sides < 2 || sides > 1000) return null;

  const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
  const sorted = [...rolls].map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);

  const droppedIndices: number[] = [];
  if (dropMod === 'dl' || dropMod === 'kh') {
    droppedIndices.push(sorted[0].i);
  } else if (dropMod === 'dh' || dropMod === 'kl') {
    droppedIndices.push(sorted[sorted.length - 1].i);
  }

  const dieResult: DieResult = { sides, rolls, dropped: droppedIndices };
  const keptTotal = rolls.reduce((sum, v, i) => droppedIndices.includes(i) ? sum : sum + v, 0);
  const total = keptTotal + modifier;

  return {
    notation,
    groups: [dieResult],
    modifier,
    total,
    isNat20: sides === 20 && count === 1 && rolls[0] === 20,
    isNat1: sides === 20 && count === 1 && rolls[0] === 1,
  };
}

/** Check if a string is a dice roll command */
export function isDiceCommand(text: string): { isRoll: boolean; notation: string } {
  const trimmed = text.trim();
  const withSlash = trimmed.match(/^\/roll\s+(.+)/i);
  if (withSlash) return { isRoll: true, notation: withSlash[1].trim() };
  const bareRoll = trimmed.match(/^roll\s+(.+)/i);
  if (bareRoll) return { isRoll: true, notation: bareRoll[1].trim() };
  return { isRoll: false, notation: '' };
}

export const QUICK_DICE = [4, 6, 8, 10, 12, 20, 100] as const;
