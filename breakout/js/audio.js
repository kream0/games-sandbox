// ─── Audio Manager (Breakout) ─────────────────────────────────────
// Synthesized sound effects — no external files needed

let ctx = null;
let masterGain = null;
let sfxGain = null;
let initialized = false;

export function isInitialized() { return initialized; }

export function initAudio() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.5;
  masterGain.connect(ctx.destination);

  sfxGain = ctx.createGain();
  sfxGain.gain.value = 0.6;
  sfxGain.connect(masterGain);

  initialized = true;
}

function playTone(freq, duration, type = 'sine', gain = 0.3, dest) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  env.gain.setValueAtTime(gain, ctx.currentTime);
  env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(env);
  env.connect(dest || sfxGain);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playNoise(duration, gain = 0.1) {
  if (!ctx) return;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const env = ctx.createGain();
  env.gain.setValueAtTime(gain, ctx.currentTime);
  env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  src.connect(env);
  env.connect(sfxGain);
  src.start(ctx.currentTime);
}

// ─── Sound Effects ──────────────────────────────────────────────

/** Paddle hit — crisp click */
export function playPaddleHit() {
  playTone(300, 0.06, 'square', 0.08);
  playTone(600, 0.04, 'sine', 0.04);
}

/** Wall/ceiling bounce — short blip */
export function playWallBounce() {
  playTone(440, 0.04, 'sine', 0.06);
}

/** Brick break — ascending bright note */
export function playBrickBreak(row) {
  const freq = 400 + row * 120;
  playTone(freq, 0.1, 'sine', 0.12);
  playTone(freq * 1.5, 0.06, 'sine', 0.05);
}

/** Death (lost ball) — descending tone */
export function playDeath() {
  playTone(400, 0.2, 'sawtooth', 0.1);
  setTimeout(() => playTone(200, 0.3, 'sawtooth', 0.08), 120);
}

/** Game over — sad descending melody */
export function playGameOver() {
  [300, 240, 180, 100].forEach((f, i) => {
    setTimeout(() => playTone(f, 0.4, 'sawtooth', 0.1), i * 200);
  });
}

/** Level complete / all bricks cleared — celebratory */
export function playVictory() {
  [523, 659, 784, 1047].forEach((f, i) => {
    setTimeout(() => playTone(f, 0.2, 'sine', 0.12), i * 80);
  });
  setTimeout(() => playNoise(0.15, 0.06), 350);
}

/** Combo multiplier hit */
export function playCombo(level) {
  const base = 500 + level * 100;
  playTone(base, 0.08, 'triangle', 0.1);
  playTone(base * 1.25, 0.06, 'sine', 0.06);
}

export function setSfxVolume(v) {
  if (sfxGain) sfxGain.gain.value = v;
}

export function resumeAudio() {
  if (ctx && ctx.state === 'suspended') ctx.resume();
}
