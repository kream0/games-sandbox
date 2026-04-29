import {
  resetState,
  isGameOver, isPaused,
} from './state.js';
import {
  scene, camera, renderer,
  boardGroup, onResize, syncBoard,
  updateEffects, disposeEffects,
} from './renderer.js';
import {
  startGame, tick, getDropInterval,
} from './game.js';
import {
  updateScore, updateLevel, updateLines,
  showGameOver, hideGameOver, showPaused, hidePaused,
} from './ui.js';
import {
  initAudio, loadMusic, startMusic, stopMusic,
  resumeAudio, isInitialized,
  setMusicVolume, setSfxVolume,
} from './audio.js';
import { initInput } from './input.js';

// ─── Game loop state ──────────────────────────────────────────────
let lastDrop = 0;
let musicLoaded = false;

// ─── Initialize everything ───────────────────────────────────────
function init() {
  resetState();
  updateScore(0);
  updateLevel(1);
  updateLines(0);
  syncBoard();
  hideGameOver();
  hidePaused();

  startGame();
  initInput();
  window.addEventListener('resize', onResize);

  // Init audio on first interaction
  const firstInteraction = () => {
    initAudio();
    loadBGM();
    window.removeEventListener('keydown', firstInteraction);
    window.removeEventListener('pointerdown', firstInteraction);
  };
  window.addEventListener('keydown', firstInteraction);
  window.addEventListener('pointerdown', firstInteraction);

  lastDrop = performance.now();
  animate();
}

// ─── Load background music ────────────────────────────────────────
async function loadBGM() {
  const ok = await loadMusic('./assets/bgm.webm');
  if (ok) {
    musicLoaded = true;
    startMusic();
  }
}

// ─── Animation loop ───────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();

  // Resume audio context if suspended (mobile browsers)
  if (isInitialized()) resumeAudio();

  // Game tick (auto drop)
  if (!isGameOver() && !isPaused()) {
    const interval = getDropInterval();
    if (now - lastDrop >= interval) {
      tick();
      lastDrop = now;
    }
  }

  // Update UI overlays
  if (isGameOver()) {
    showGameOver();
  } else {
    hideGameOver();
  }

  if (isPaused()) {
    showPaused();
  } else {
    hidePaused();
  }

  // Visual effects
  updateEffects(now);

  renderer.render(scene, camera);
}

// ─── Restart game ─────────────────────────────────────────────────
function restart() {
  disposeEffects();
  resetState();
  updateScore(0);
  updateLevel(1);
  updateLines(0);
  syncBoard();
  hideGameOver();
  hidePaused();
  startGame();
  lastDrop = performance.now();
}

// ─── Wire restart button ──────────────────────────────────────────
const restartBtn = document.getElementById('restart-btn');
if (restartBtn) {
  restartBtn.addEventListener('click', restart);
}

// ─── Keyboard restart (R key when game over) ──────────────────────
window.addEventListener('keydown', (e) => {
  if ((e.key === 'r' || e.key === 'R') && isGameOver()) {
    restart();
  }
});

// ─── Wire volume sliders ─────────────────────────────────────────
const sfxSlider = document.getElementById('sfx-volume');
const musicSlider = document.getElementById('music-volume');

if (sfxSlider) {
  sfxSlider.addEventListener('input', () => setSfxVolume(parseFloat(sfxSlider.value)));
}

if (musicSlider) {
  musicSlider.addEventListener('input', () => setMusicVolume(parseFloat(musicSlider.value)));
}

// ─── Go ───────────────────────────────────────────────────────────
init();

console.log('🧱 3D Tetris ready!');
console.log('Board: 10x20, Level: 1');
