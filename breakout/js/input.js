import { isGameOver, isPaused, setPaused, ball } from './state.js';
import { movePaddle, launchBall } from './game.js';
import { renderer, camera } from './renderer.js';
import { CAMERA_Z } from './constants.js';

// ─── Mouse / pointer tracking ─────────────────────────────────────
export function initInput() {
  let isPointerDown = false;

  const onPointerMove = (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    // NDC x: -1 (left) to +1 (right)
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;

    // Camera is at (0, 0, CAMERA_Z) looking at (0, 0, 0) with FOV.
    // Compute the visible half-width at z = 0 (the board plane).
    const halfFov = (camera.fov * Math.PI) / 360;
    const halfVisHeight = Math.tan(halfFov) * CAMERA_Z;
    const halfVisWidth = halfVisHeight * camera.aspect;

    // Map NDC to world X at the board plane
    const worldX = ndcX * halfVisWidth;
    movePaddle(worldX);
  };

  const onPointerDown = () => {
    isPointerDown = true;
    if (!ball.active) launchBall();
  };
  const onPointerUp = () => { isPointerDown = false; };

  const canvas = renderer.domElement;
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);

  // ─── Keyboard ────────────────────────────────────────────────
  window.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P') {
      if (!isGameOver()) setPaused(!isPaused());
    }
    if (e.key === ' ' || e.key === 'Space') {
      e.preventDefault();
      if (!ball.active) launchBall();
    }
    if ((e.key === 'r' || e.key === 'R') && isGameOver()) {
      window.dispatchEvent(new CustomEvent('restart'));
    }
  });
}
