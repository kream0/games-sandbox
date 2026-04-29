import {
  resetState, isGameOver, isPaused,
} from './state.js';
import {
  scene, camera, renderer,
  onResize, sync, syncBricks,
  updateEffects, disposeEffects,
} from './renderer.js';
import {
  tick,
} from './game.js';
import {
  updateScore, updateLives,
  showGameOver, hideGameOver, showPaused, hidePaused,
} from './ui.js';
import {
  initAudio, resumeAudio, isInitialized, setSfxVolume,
} from './audio.js';
import { initInput } from './input.js';

// ─── Game loop state ──────────────────────────────────────────────
let lastTick = 0;

// ─── Init ─────────────────────────────────────────────────────────
function init() {
  resetState();
  updateScore(0);
  updateLives(3);
  syncBricks();
  sync();
  hideGameOver();
  hidePaused();
  initInput();
  window.addEventListener('resize', onResize);

  const firstInteraction = () => {
    initAudio();
    window.removeEventListener('keydown', firstInteraction);
    window.removeEventListener('pointerdown', firstInteraction);
  };
  window.addEventListener('keydown', firstInteraction);
  window.addEventListener('pointerdown', firstInteraction);

  lastTick = performance.now();
  animate();
}

// ─── Animation loop ───────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();

  if (isInitialized()) resumeAudio();

  if (!isGameOver() && !isPaused()) {
    const dt = Math.min((now - lastTick) / 1000, 0.033);
    if (dt > 0) {
      tick(dt);
      lastTick = now;
    }
    sync();
  }

  // Overlays
  if (isGameOver()) showGameOver(); else hideGameOver();
  if (isPaused()) showPaused(); else hidePaused();

  // HUD
  updateLives(lives.value);
  updateScore(score.value);

  updateEffects(now);
  renderer.render(scene, camera);
}

// ─── Restart ──────────────────────────────────────────────────────
function restart() {
  disposeEffects();
  resetState();
  updateScore(0);
  updateLives(3);
  syncBricks();
  sync();
  hideGameOver();
  hidePaused();
  lastTick = performance.now();
}

// ─── Wire restart ─────────────────────────────────────────────────
document.getElementById('restart-btn').addEventListener('click', restart);
window.addEventListener('restart', restart);
window.addEventListener('keydown', (e) => {
  if ((e.key === 'r' || e.key === 'R') && isGameOver()) restart();
});

// ─── Wire volume ──────────────────────────────────────────────────
const sfxSlider = document.getElementById('sfx-volume');
if (sfxSlider) {
  sfxSlider.addEventListener('input', () => setSfxVolume(parseFloat(sfxSlider.value)));
}

// ─── Go ───────────────────────────────────────────────────────────
init();
