import type { DeityId } from '../data/deities';

export type GemType = DeityId;

export type Board = (GemType | null)[][];

export interface Position {
  row: number;
  col: number;
}

export interface Match {
  deity: GemType;
  positions: Position[];
}

export interface Move {
  from: Position;
  to: Position;
}
