import type { Board, GemType } from './types';
import { DEITY_IDS } from '../data/deities';

export function createBoard(rows: number, cols: number, maxGemTypes = 8): Board {
  const types = DEITY_IDS.slice(0, Math.min(maxGemTypes, DEITY_IDS.length));
  const board: Board = [];
  for (let r = 0; r < rows; r++) {
    const rowData: (GemType | null)[] = [];
    for (let c = 0; c < cols; c++) {
      rowData.push(pickRandomGem(board, rowData, r, c, rows, cols, types));
    }
    board.push(rowData);
  }
  return board;
}

function pickRandomGem(
  board: Board,
  currentRow: (GemType | null)[],
  row: number,
  col: number,
  numRows: number,
  numCols: number,
  types: GemType[] = DEITY_IDS
): GemType {
  let gem: GemType;
  let attempts = 0;
  do {
    gem = types[Math.floor(Math.random() * types.length)];
    attempts++;
    if (attempts > 20) break;
  } while (wouldCreateMatch(board, currentRow, row, col, numRows, numCols, gem, types));
  return gem;
}

function wouldCreateMatch(
  board: Board,
  currentRow: (GemType | null)[],
  row: number,
  col: number,
  numRows: number,
  numCols: number,
  gem: GemType,
  _types?: GemType[]
): boolean {
  const getCell = (r: number, c: number): GemType | null => {
    if (r === row) return currentRow[c] ?? null;
    return board[r]?.[c] ?? null;
  };

  const horizontal =
    (col >= 2 && getCell(row, col - 1) === gem && getCell(row, col - 2) === gem) ||
    (col >= 1 && col < numCols - 1 && getCell(row, col - 1) === gem && getCell(row, col + 1) === gem) ||
    (col < numCols - 2 && getCell(row, col + 1) === gem && getCell(row, col + 2) === gem);
  const vertical =
    (row >= 2 && getCell(row - 1, col) === gem && getCell(row - 2, col) === gem) ||
    (row >= 1 && row < numRows - 1 && getCell(row - 1, col) === gem && getCell(row + 1, col) === gem) ||
    (row < numRows - 2 && getCell(row + 1, col) === gem && getCell(row + 2, col) === gem);
  return horizontal || vertical;
}

export function swapGems(board: Board, from: { row: number; col: number }, to: { row: number; col: number }): Board {
  const next = board.map(r => [...r]);
  const temp = next[from.row][from.col];
  next[from.row][from.col] = next[to.row][to.col];
  next[to.row][to.col] = temp;
  return next;
}

export function removeMatches(board: Board, positions: { row: number; col: number }[]): Board {
  const set = new Set(positions.map(p => `${p.row},${p.col}`));
  const next = board.map((row, r) =>
    row.map((cell, c) => (set.has(`${r},${c}`) ? null : cell))
  );
  return next;
}

export function fillGaps(board: Board, maxGemTypes = 8): { board: Board; newGems: { row: number; col: number; gem: GemType }[] } {
  const types = DEITY_IDS.slice(0, Math.min(maxGemTypes, DEITY_IDS.length));
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const next = board.map(r => [...r]);
  const newGems: { row: number; col: number; gem: GemType }[] = [];

  for (let c = 0; c < cols; c++) {
    let writeRow = rows - 1;
    for (let r = rows - 1; r >= 0; r--) {
      if (next[r][c] !== null) {
        if (r !== writeRow) {
          next[writeRow][c] = next[r][c];
          next[r][c] = null;
        }
        writeRow--;
      }
    }
    for (let r = writeRow; r >= 0; r--) {
      const gem = types[Math.floor(Math.random() * types.length)];
      next[r][c] = gem;
      newGems.push({ row: r, col: c, gem });
    }
  }

  return { board: next, newGems };
}
