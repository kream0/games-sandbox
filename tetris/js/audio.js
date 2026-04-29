// ─── Audio Manager ────────────────────────────────────────────────
// Synthesized sound effects + background music player
// Upgraded with reverb/delay, stereo spread, and richer synthesis

let ctx = null;
let masterGain = null;
let sfxGain = null;
let musicGain = null;
let bgmBuffer = null;
let bgmSource = null;
let initialized = false;
let reverbNode = null;

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

  musicGain = ctx.createGain();
  musicGain.gain.value = 0.25;
  musicGain.connect(masterGain);

  // Simple reverb using convolver (emulated with delay + feedback)
  reverbNode = ctx.createConvolver();
  reverbNode.buffer = createImpulseResponse(1.2, 0.6);
  reverbNode.connect(sfxGain);

  initialized = true;
}

// Create a synthetic impulse response for reverb
function createImpulseResponse(duration, decay) {
  if (!ctx) return null;
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * duration);
  const buffer = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay * 4);
    }
  }
  return buffer;
}

// ─── Tone synthesis helper ──────────────────────────────────────
function playTone(freq, duration, type = 'sine', gain = 0.3, dest, pan = 0) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  env.gain.setValueAtTime(gain, ctx.currentTime);
  env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  let panner = null;
  if (pan !== 0) {
    panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(pan, ctx.currentTime);
  }

  osc.connect(env);
  if (panner) {
    env.connect(panner);
    panner.connect(dest || sfxGain);
  } else {
    env.connect(dest || sfxGain);
  }
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

// ─── Noise burst helper ─────────────────────────────────────────
function playNoise(duration, gain = 0.1, dest) {
  if (!ctx) return;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const env = ctx.createGain();
  env.gain.setValueAtTime(gain, ctx.currentTime);
  env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  source.connect(env);
  env.connect(dest || sfxGain);
  source.start(ctx.currentTime);
}

// ─── Filtered noise (for sizzle/crackle) ────────────────────────
function playFilteredNoise(duration, gain, freq, Q = 1) {
  if (!ctx) return;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(freq, ctx.currentTime);
  filter.Q.setValueAtTime(Q, ctx.currentTime);
  const env = ctx.createGain();
  env.gain.setValueAtTime(gain, ctx.currentTime);
  env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  source.connect(filter);
  filter.connect(env);
  env.connect(sfxGain);
  source.start(ctx.currentTime);
}

// ─── Sound Effects ──────────────────────────────────────────────

/** Quick click for lateral movement */
export function playMove() {
  playTone(220, 0.04, 'square', 0.08, null, (Math.random() - 0.5) * 0.3);
}

/** Chirp for rotation */
export function playRotate() {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(350, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(500, ctx.currentTime + 0.06);
  env.gain.setValueAtTime(0.12, ctx.currentTime);
  env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  osc.connect(env);
  env.connect(sfxGain);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.08);
}

/** Thud for soft drop / piece landing */
export function playDrop() {
  playTone(80, 0.12, 'triangle', 0.15);
  playNoise(0.06, 0.04);
}

/** Heavy thud for hard drop */
export function playHardDrop() {
  playTone(50, 0.3, 'triangle', 0.25);
  playNoise(0.12, 0.08);
  // Rumble
  playTone(30, 0.4, 'sine', 0.1);
}

/** Impact crackle when piece locks (filtered noise burst) */
export function playLockSizzle() {
  playFilteredNoise(0.12, 0.06, 3000, 3);
  playTone(200, 0.06, 'square', 0.04);
}

/** Ascending sweep for line clear — upgraded with reverb & depth */
export function playLineClear(count = 1) {
  if (!ctx) return;
  const baseFreq = 260 + count * 40;

  // Main ascending sweep (with reverb)
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.5, ctx.currentTime + 0.35);
  env.gain.setValueAtTime(0.25, ctx.currentTime);
  env.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.15);
  env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
  osc.connect(env);
  env.connect(reverbNode || sfxGain);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.5);

  // Bass rumble hit (physical feedback)
  const bass = ctx.createOscillator();
  const bassEnv = ctx.createGain();
  bass.type = 'sine';
  bass.frequency.setValueAtTime(40 + count * 10, ctx.currentTime);
  bassEnv.gain.setValueAtTime(0.15 * count, ctx.currentTime);
  bassEnv.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  bass.connect(bassEnv);
  bassEnv.connect(sfxGain);
  bass.start(ctx.currentTime);
  bass.stop(ctx.currentTime + 0.3);

  // Stereo sparkle particles (on reverb bus)
  for (let i = 0; i < count * 3; i++) {
    const t = i * 30 + 10;
    const pan = (Math.random() - 0.5) * 0.8;
    setTimeout(() => {
      playTone(800 + Math.random() * 1200, 0.12, 'sine', 0.06, reverbNode, pan);
    }, t);
  }

  // Crunch / sizzle for impact feel
  playFilteredNoise(0.08 * count, 0.04 * count, 4000, 5);

  // "TETRIS!" dramatic finish for 4 lines
  if (count === 4) {
    setTimeout(() => {
      // Chord: C5 + E5 + G5 + C6 with reverb
      [523, 659, 784, 1047].forEach((f, i) => {
        const pan = (i / 3) * 0.6 - 0.3;
        setTimeout(() => playTone(f, 0.35, 'sine', 0.18, reverbNode, pan), i * 80);
      });
      // Explosion noise
      playNoise(0.3, 0.12);
    }, 350);
  }
}

/** Descending tones for game over */
export function playGameOver() {
  [300, 240, 180, 120].forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.45, 'sawtooth', 0.12, null, (i / 3) * 0.4 - 0.2), i * 200);
  });
  // Final low rumble
  setTimeout(() => playTone(50, 0.6, 'triangle', 0.15), 800);
}

/** Ascending arpeggio for level up */
export function playLevelUp() {
  [400, 500, 630, 800, 1000].forEach((freq, i) => {
    const pan = (i / 4) * 0.6 - 0.3;
    setTimeout(() => playTone(freq, 0.18, 'sine', 0.18, reverbNode, pan), i * 80);
  });
  // Final chime
  setTimeout(() => playTone(1200, 0.3, 'sine', 0.12, reverbNode), 450);
}

// ─── Background Music ────────────────────────────────────────────

export async function loadMusic(url) {
  if (!ctx) initAudio();
  try {
    const resp = await fetch(url);
    const buf = await resp.arrayBuffer();
    bgmBuffer = await ctx.decodeAudioData(buf);
    return true;
  } catch (e) {
    console.warn('Failed to load BGM:', e);
    return false;
  }
}

export function startMusic() {
  if (!ctx || !bgmBuffer) return;
  try {
    if (bgmSource) { bgmSource.stop(); bgmSource.disconnect(); }
    bgmSource = ctx.createBufferSource();
    bgmSource.buffer = bgmBuffer;
    bgmSource.loop = true;
    bgmSource.connect(musicGain);
    bgmSource.start();
  } catch (e) { console.warn('BGM play error:', e); }
}

export function stopMusic() {
  if (bgmSource) {
    try { bgmSource.stop(); } catch (_) { /* ignore */ }
    bgmSource.disconnect();
    bgmSource = null;
  }
}

export function setMusicVolume(v) {
  if (musicGain) musicGain.gain.value = v;
}

export function setSfxVolume(v) {
  if (sfxGain) sfxGain.gain.value = v;
}

/** Resume audio context (needed after user gesture) */
export function resumeAudio() {
  if (ctx && ctx.state === 'suspended') ctx.resume();
}
