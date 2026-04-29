export function updateScore(v) {
  document.getElementById('score').textContent = Math.floor(v);
}

export function updateLives(v) {
  const el = document.getElementById('lives');
  el.textContent = '\u2665'.repeat(Math.max(0, v));
}

export function showGameOver() {
  document.getElementById('game-over').classList.add('visible');
}

export function hideGameOver() {
  document.getElementById('game-over').classList.remove('visible');
}

export function showPaused() {
  document.getElementById('pause-msg').classList.add('visible');
}

export function hidePaused() {
  document.getElementById('pause-msg').classList.remove('visible');
}
