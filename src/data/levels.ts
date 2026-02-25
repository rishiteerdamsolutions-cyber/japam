import type { DeityId } from './deities';

export interface LevelObjective {
  type: 'total' | 'deity';
  deity?: DeityId;
  count: number;
}

export interface LevelConfig {
  id: string;
  episode: number;
  japaTarget: number;
  deityTarget?: DeityId;
  moves: number;
  rows: number;
  cols: number;
  /** Fewer types = easier to match. Level 1-2: 4, 3-4: 5, 5-10: 6, etc. */
  maxGemTypes: number;
}

export const LEVELS: LevelConfig[] = [];
export const DAILY_GOAL_JAPAS = 108; // Levels 1-5 combined (3+11+21+33+40)
export const TOTAL_LEVELS = 1000;

const INCREMENTS = [3, 11, 21, 33, 40]; // Levels 1-5, then cycles for 6+

function createLevels() {
  for (let id = 1; id <= TOTAL_LEVELS; id++) {
    let japaTarget: number;
    if (id <= 5) {
      japaTarget = INCREMENTS[id - 1]!;
    } else {
      let val = 108;
      for (let i = 6; i < id; i++) {
        val += INCREMENTS[(i - 6) % 5]!;
      }
      japaTarget = val;
    }
    const maxGemTypes =
      id <= 2 ? 4 : id <= 4 ? 5 : id <= 10 ? 6 : id <= 20 ? 7 : id <= 50 ? 8 : id <= 200 ? 8 : 8;
    LEVELS.push({
      id: `level-${id}`,
      episode: Math.ceil(id / 10),
      japaTarget,
      moves: 80,
      rows: 8,
      cols: 8,
      maxGemTypes,
    });
  }
}

createLevels();

export function getLevel(id: string): LevelConfig | undefined {
  return LEVELS.find(l => l.id === id);
}

export function getLevelForMode(mode: 'general' | string, levelIndex: number): LevelConfig | undefined {
  const level = LEVELS[levelIndex];
  if (!level) return undefined;
  const levelCopy = { ...level };
  if (mode !== 'general') {
    levelCopy.deityTarget = mode as DeityId;
  }
  return levelCopy;
}
