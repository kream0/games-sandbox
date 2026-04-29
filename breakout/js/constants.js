// ─── Board Dimensions ─────────────────────────────────────────────
export const COLS = 10;
export const ROWS = 5;

// ─── Visual ───────────────────────────────────────────────────────
export const BRICK_WIDTH = 0.85;
export const BRICK_HEIGHT = 0.35;
export const BRICK_DEPTH = 0.3;
export const GAP = 0.08;
export const PADDLE_WIDTH = 2.4;
export const PADDLE_HEIGHT = 0.22;
export const PADDLE_DEPTH = 0.35;
export const BALL_RADIUS = 0.18;
export const BALL_SPEED = 7;
export const BALL_MAX_SPEED = 14;

// ─── Camera ───────────────────────────────────────────────────────
export const CAMERA_Z = 26;

// ─── Scoring ──────────────────────────────────────────────────────
export const ROW_SCORES = [10, 20, 30, 40, 50]; // bottom row → top row

// ─── Colors ───────────────────────────────────────────────────────
export const BRICK_COLORS = [
  0xe57373, // row 0 — red
  0xffb74d, // row 1 — orange
  0xffd54f, // row 2 — yellow
  0x81c784, // row 3 — green
  0x64b5f6, // row 4 — blue
];

export const PADDLE_COLOR = 0xce93d8; // purple
export const BALL_COLOR = 0xffffff;
