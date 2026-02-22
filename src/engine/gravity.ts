import type { Board } from './types';

export function applyGravity(board: Board): { board: Board; movements: { from: { row: number; col: number }; to: { row: number; col: number } }[] } {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const next = board.map(r => [...r]);
  const movements: { from: { row: number; col: number }; to: { row: number; col: number } }[] = [];

  for (let c = 0; c < cols; c++) {
    let writeRow = rows - 1;
    for (let r = rows - 1; r >= 0; r--) {
      if (next[r][c] !== null) {
        if (r !== writeRow) {
          movements.push({ from: { row: r, col: c }, to: { row: writeRow, col: c } });
          next[writeRow][c] = next[r][c];
          next[r][c] = null;
        }
        writeRow--;
      }
    }
  }

  return { board: next, movements };
}
