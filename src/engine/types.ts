import type { DeityId } from '../data/deities';
import type { GemType } from './gemKinds';

export type { GemType };

export type Board = (GemType | null)[][];

export interface Position {
  row: number;
  col: number;
}

export interface Match {
  deity: DeityId;
  positions: Position[];
}

export interface Move {
  from: Position;
  to: Position;
}
