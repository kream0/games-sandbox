// ─── Difficulty Presets ──────────────────────────────────────────
export const DIFFICULTIES = {
  easy:   { label: 'Easy',   GRID_SIZE: 9,  MINE_COUNT: 10 },
  medium: { label: 'Medium', GRID_SIZE: 12, MINE_COUNT: 25 },
  hard:   { label: 'Hard',   GRID_SIZE: 16, MINE_COUNT: 50 },
};

// Current difficulty (mutable via UI)
export let GRID_SIZE = DIFFICULTIES.easy.GRID_SIZE;
export let MINE_COUNT = DIFFICULTIES.easy.MINE_COUNT;

export function setDifficulty(key) {
  const d = DIFFICULTIES[key];
  if (d) {
    GRID_SIZE = d.GRID_SIZE;
    MINE_COUNT = d.MINE_COUNT;
  }
}

// ─── Visual Constants ────────────────────────────────────────────
export const CELL_SIZE = 1.0;
export const GAP = 0.06;
export const BLOCK_HEIGHT = 0.6;
export const RAISED_HEIGHT = 0.05;

// ─── Number Colors ───────────────────────────────────────────────
export const COLORS = {
  hidden: 0x2d3561,
  hiddenHover: 0x3d4a7a,
  revealed: 0x0f3460,
  mine: 0xe94560,
  flag: 0xff6b6b,
  1: 0x4fc3f7,
  2: 0x81c784,
  3: 0xff8a65,
  4: 0xba68c8,
  5: 0xf06292,
  6: 0x4dd0e1,
  7: 0x7986cb,
  8: 0x90a4ae,
};
