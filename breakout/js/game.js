import {
  COLS, ROWS,
  BRICK_WIDTH, BRICK_HEIGHT, GAP,
  PADDLE_WIDTH, BALL_RADIUS,
  BALL_SPEED, BALL_MAX_SPEED,
  ROW_SCORES,
} from './constants.js';
import {
  bricks, paddleX, ball,
  score, lives, combo,
  setPaddleX, setBall, setCombo,
  setGameOver, isGameOver,
  resetBall, initBricks, countBricks,
} from './state.js';
import {
  sync, syncBricks,
  triggerShake, triggerBgFlash, emitBrickBreakParticles,
} from './renderer.js';
import {
  playPaddleHit, playWallBounce,
  playBrickBreak, playDeath,
  playGameOver, playVictory, playCombo,
} from './audio.js';

// ─── Brick world coords helper ────────────────────────────────────
const step = BRICK_WIDTH + GAP;
const halfCols = (COLS - 1) / 2;

function brickWorldPos(row, col) {
  const x = (col - halfCols) * step;
  const y = (ROWS - 1) * step / 2 - row * step;
  return { x, y };
}

// ─── Bounds ───────────────────────────────────────────────────────
const halfW = (COLS * step - GAP) / 2;
const boundsL = -(halfW + 0.5);
const boundsR = halfW + 0.5;
const boundsT = (ROWS * step - GAP) / 2 + 0.5;
const boundsB = -7.6; // just above where paddle would be

// ─── Check if all bricks cleared ─────────────────────────────────
function allCleared() {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (bricks[r][c]) return false;
  return true;
}

// ─── Launch ball ──────────────────────────────────────────────────
export function launchBall() {
  if (ball.active) return;
  const angle = (Math.random() - 0.5) * 0.8 - Math.PI / 2;
  ball.vx = Math.cos(angle) * BALL_SPEED;
  ball.vy = Math.sin(angle) * BALL_SPEED;
  ball.active = true;
}

// ─── Move paddle ──────────────────────────────────────────────────
export function movePaddle(targetX) {
  const halfP = PADDLE_WIDTH / 2;
  paddleX = Math.max(boundsL + halfP, Math.min(boundsR - halfP, targetX));
  setPaddleX(paddleX);
}

// ─── Ball physics + collision ─────────────────────────────────────
export function tick(dt) {
  if (isGameOver() || !ball.active) return;

  let bx = ball.x + ball.vx * dt;
  let by = ball.y + ball.vy * dt;
  let vx = ball.vx;
  let vy = ball.vy;
  let bounced = false;

  // ─── Wall collisions ──────────────────────────────────────────
  if (bx - BALL_RADIUS < boundsL) {
    bx = boundsL + BALL_RADIUS;
    vx = Math.abs(vx);
    bounced = true;
  } else if (bx + BALL_RADIUS > boundsR) {
    bx = boundsR - BALL_RADIUS;
    vx = -Math.abs(vx);
    bounced = true;
  }

  if (by + BALL_RADIUS > boundsT) {
    by = boundsT - BALL_RADIUS;
    vy = -Math.abs(vy);
    bounced = true;
  }

  if (bounced) playWallBounce();

  // ─── Paddle collision ─────────────────────────────────────────
  const paddleY = -7.5;
  const halfP = PADDLE_WIDTH / 2;
  if (vy < 0 && // ball moving down
      by - BALL_RADIUS <= paddleY + PADDLE_WIDTH / 12 &&
      by - BALL_RADIUS >= paddleY - PADDLE_WIDTH / 6 &&
      bx >= paddleX - halfP - BALL_RADIUS &&
      bx <= paddleX + halfP + BALL_RADIUS) {
    // Reflect with angle based on hit position
    const hit = (bx - paddleX) / halfP; // -1 to 1
    const angle = hit * 0.6 - Math.PI / 2;
    const speed = Math.min(Math.sqrt(vx * vx + vy * vy) * 1.02, BALL_MAX_SPEED);
    vx = Math.cos(angle) * speed;
    vy = Math.sin(angle) * speed;
    by = paddleY + BALL_RADIUS;
    playPaddleHit();
    triggerShake(0.05, 0.1);
  }

  // ─── Brick collisions ─────────────────────────────────────────
  const halfBw = BRICK_WIDTH / 2;
  const halfBh = BRICK_HEIGHT / 2;

  // Check ball center against each brick's AABB
  const cx = bx;
  const cy = by;
  let hitBrick = false;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!bricks[r][c]) continue;
      const { x: bw, y: bh } = brickWorldPos(r, c);
      const dx = cx - bw;
      const dy = cy - bh;

      // AABB overlap: expand brick half-extents by ball radius
      const overlapX = halfBw + BALL_RADIUS;
      const overlapY = halfBh + BALL_RADIUS;

      if (Math.abs(dx) < overlapX && Math.abs(dy) < overlapY) {
        // Determine collision side (MTV)
        const penX = overlapX - Math.abs(dx);
        const penY = overlapY - Math.abs(dy);

        if (penX < penY) {
          vx = -vx;
        } else {
          vy = -vy;
        }

        // Destroy brick
        bricks[r][c] = false;
        hitBrick = true;

        // Combo
        combo.value++;
        const cLevel = Math.min(combo.value, 10);

        // Score
        const rowScore = ROW_SCORES[r];
        score.value += rowScore * (1 + cLevel * 0.1);

        // Effects
        const { x: ex, y: ey } = brickWorldPos(r, c);
        const color = [
          0xe57373, 0xffb74d, 0xffd54f, 0x81c784, 0x64b5f6,
        ][r];
        emitBrickBreakParticles(ex, ey, color, 8 + cLevel);
        triggerShake(0.04 + cLevel * 0.01, 0.15);
        triggerBgFlash(0.04 + cLevel * 0.01);
        playBrickBreak(r);

        if (cLevel > 1) playCombo(cLevel);

        // Regen bricks for bounce check (one brick per frame max)
        break;
      }
    }
    if (hitBrick) break;
  }

  // ─── Apply state ──────────────────────────────────────────────
  ball.x = bx;
  ball.y = by;
  ball.vx = vx;
  ball.vy = vy;
  setBall(ball);

  if (hitBrick) {
    syncBricks();
    if (allCleared()) {
      playVictory();
      initBricks();
      syncBricks();
      score.value += 500;
      resetBall();
    }
  }

  // ─── Ball fell off bottom ────────────────────────────────────
  if (by < -9) {
    lives.value--;
    playDeath();
    triggerShake(0.3, 0.4);
    if (lives.value <= 0) {
      setGameOver(true);
      playGameOver();
    } else {
      resetBall();
    }
  }
}

// ─── Initial setup ────────────────────────────────────────────────
export function startGame() {
  initBricks();
  resetBall();
  syncBricks();
  sync();
}
