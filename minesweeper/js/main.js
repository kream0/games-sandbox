import { GRID_SIZE, MINE_COUNT, setDifficulty } from './constants.js';
import { resetState } from './state.js';
import { buildScene } from './cells.js';
import { scene, camera, renderer, labelRenderer, controls, onResize, updateCameraForSize } from './scene.js';
import { updateMineCount, updateTimer, restartBtn, difficultySelect } from './ui.js';
import { restartGame } from './game.js';
import { initInput } from './input.js';

// ─── Initialize Everything ──────────────────────────────────────
resetState();
buildScene();
updateCameraForSize();
updateMineCount();
updateTimer(0);

// ─── Input ──────────────────────────────────────────────────────
initInput();

// ─── Resize ─────────────────────────────────────────────────────
window.addEventListener('resize', onResize);

// ─── Restart Button ─────────────────────────────────────────────
restartBtn.addEventListener('click', restartGame);

// ─── Difficulty Selector ────────────────────────────────────────
difficultySelect.addEventListener('change', () => {
  const key = difficultySelect.value;
  setDifficulty(key);
  restartGame();
});

// ─── Animation Loop ─────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

animate();

console.log('🎮 3D Minesweeper ready!');
console.log(`Grid: ${GRID_SIZE}x${GRID_SIZE}, Mines: ${MINE_COUNT}`);

// Expose for debugging
window.__MINESWEEPER = { scene, camera, controls, renderer };
