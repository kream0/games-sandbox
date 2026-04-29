import * as THREE from 'three';
import {
  COLS, ROWS, HIDDEN_ROWS,
  CELL_SIZE, GAP, BLOCK_HEIGHT,
  PIECE_COLORS,
} from './constants.js';
import { board, currentPiece, getCurrentCells } from './state.js';
import { getGhostY } from './game.js';

// ─── Scene ────────────────────────────────────────────────────────
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f0f23);
scene.fog = new THREE.Fog(0x0f0f23, 25, 40);

// ─── Camera (fixed, no orbit) ────────────────────────────────────
const ASPECT = window.innerWidth / window.innerHeight;
export const camera = new THREE.PerspectiveCamera(45, ASPECT, 0.1, 80);
camera.position.set(0, 0, 30);
camera.lookAt(0, 0, 0);

// Store base camera position for shake recovery
const cameraBasePos = camera.position.clone();

// ─── Renderer ─────────────────────────────────────────────────────
export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.prepend(renderer.domElement);

// ─── Lights ───────────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0x4040a0, 0.5);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xffeedd, 2.8);
keyLight.position.set(6, 12, 8);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 1024;
keyLight.shadow.mapSize.height = 1024;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 30;
keyLight.shadow.camera.left = -12;
keyLight.shadow.camera.right = 12;
keyLight.shadow.camera.top = 16;
keyLight.shadow.camera.bottom = -4;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x8888ff, 0.5);
fillLight.position.set(-4, 6, -3);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xff8844, 0.3);
rimLight.position.set(-2, 0, -8);
scene.add(rimLight);

const hemi = new THREE.HemisphereLight(0x4466ff, 0x222244, 0.4);
scene.add(hemi);

// ─── Backdrop wall ────────────────────────────────────────────────
const wallW = COLS * (CELL_SIZE + GAP) + 3;
const wallH = ROWS * (CELL_SIZE + GAP) + 1;
const wallGeo = new THREE.PlaneGeometry(wallW, wallH);
const wallMat = new THREE.MeshStandardMaterial({
  color: 0x141428,
  roughness: 0.9,
  metalness: 0.05,
  side: THREE.DoubleSide,
});
const wall = new THREE.Mesh(wallGeo, wallMat);
wall.position.set(0, 0, -BLOCK_HEIGHT / 2 - 0.1);
scene.add(wall);

// ─── Grid lines (aligned exactly with block positions) ───────────
const gridGroup = new THREE.Group();
scene.add(gridGroup);

function buildGrid() {
  while (gridGroup.children.length) gridGroup.remove(gridGroup.children[0]);

  const points = [];
  const halfCols = (COLS - 1) / 2;
  const halfRows = (ROWS - 1) / 2;
  const step = CELL_SIZE + GAP;
  const off = 0.01;

  // Vertical lines (c = 0..COLS runs between columns)
  for (let c = 0; c <= COLS; c++) {
    const x = (c - halfCols) * step - 0.5 - GAP / 2;
    const yTop = halfRows * step + 0.5 + GAP / 2;
    const yBot = -halfRows * step - 0.5 - GAP / 2;
    points.push(new THREE.Vector3(x, yTop, off));
    points.push(new THREE.Vector3(x, yBot, off));
  }
  // Horizontal lines (r = 0..ROWS runs between rows)
  for (let r = 0; r <= ROWS; r++) {
    const y = (halfRows - r) * step + 0.5 + GAP / 2;
    const xL = -halfCols * step - 0.5 - GAP / 2;
    const xR = halfCols * step + 0.5 + GAP / 2;
    points.push(new THREE.Vector3(xL, y, off));
    points.push(new THREE.Vector3(xR, y, off));
  }

  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({
    color: 0x2a2a5a,
    transparent: true,
    opacity: 0.5,
  });
  const lines = new THREE.LineSegments(geo, mat);
  gridGroup.add(lines);
}
buildGrid();

// ─── Board group (placed blocks + current piece) ──────────────────
export const boardGroup = new THREE.Group();
scene.add(boardGroup);

// ─── Ghost piece group ────────────────────────────────────────────
const ghostGroup = new THREE.Group();
scene.add(ghostGroup);

// ═══════════════════════════════════════════════════════════════════
// PARTICLE SYSTEM (UPGRADED)
// ═══════════════════════════════════════════════════════════════════

const PARTICLE_LIFETIME = 1.4;
const MAX_PARTICLES = 600;
const particles = [];

let particleGeo = null;
let particleMat = null;
let particleMesh = null;

function ensureParticleMesh() {
  if (!particleMesh) {
    particleGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    particleMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
    });
    particleMesh = new THREE.InstancedMesh(particleGeo, particleMat, MAX_PARTICLES);
    particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    particleMesh.count = 0;
    particleMesh.visible = false;
    scene.add(particleMesh);
  }
}

const particleDummy = new THREE.Object3D();

export function emitParticles(worldX, worldY, count, color, spread = 2, biasY = 0) {
  ensureParticleMesh();
  const c = new THREE.Color(color);
  for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = spread * (0.5 + Math.random() * 1.0);
    particles.push({
      x: worldX + (Math.random() - 0.5) * 0.3,
      y: worldY + (Math.random() - 0.5) * 0.3,
      z: 0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed + biasY,
      vz: (Math.random() - 0.5) * spread * 0.6,
      life: PARTICLE_LIFETIME * (0.5 + Math.random() * 0.5),
      maxLife: PARTICLE_LIFETIME,
      color: c,
      size: 0.04 + Math.random() * 0.12,
      // rotation
      rx: Math.random() * Math.PI * 2,
      ry: Math.random() * Math.PI * 2,
      rz: Math.random() * Math.PI * 2,
      rvx: (Math.random() - 0.5) * 12,
      rvy: (Math.random() - 0.5) * 12,
      rvz: (Math.random() - 0.5) * 12,
    });
  }
}

export function emitLineClearParticles(rows) {
  const step = CELL_SIZE + GAP;
  const halfCols = (COLS - 1) / 2;
  const colors = Object.values(PIECE_COLORS);
  for (const row of rows) {
    const wy = ((ROWS - 1) / 2 - (row - HIDDEN_ROWS)) * step;
    for (let c = 0; c < COLS; c++) {
      const wx = (c - halfCols) * step;
      // Direction: outward from center, stronger at edges
      const t = (c - (COLS - 1) / 2) / ((COLS - 1) / 2);
      const spread = 1.5 + Math.abs(t) * 1.5;
      const color = colors[Math.floor(Math.random() * colors.length)];
      emitParticles(wx, wy, 3, color, spread, 1.0);
    }
  }
}

function updateParticles(dt) {
  ensureParticleMesh();
  let idx = 0;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.vx *= 0.97;
    p.vy += -9.8 * dt; // gravity
    p.vz *= 0.97;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    // Rotation
    p.rx += p.rvx * dt;
    p.ry += p.rvy * dt;
    p.rz += p.rvz * dt;
    const t = p.life / p.maxLife;
    particleDummy.position.set(p.x, p.y, p.z);
    const s = p.size * (0.3 + 0.7 * t);
    particleDummy.scale.set(s, s, s);
    particleDummy.rotation.set(p.rx, p.ry, p.rz);
    particleDummy.updateMatrix();
    particleMesh.setMatrixAt(idx, particleDummy.matrix);
    particleMesh.setColorAt(idx, p.color);
    idx++;
  }
  particleMesh.count = idx;
  particleMesh.instanceMatrix.needsUpdate = true;
  if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
  particleMesh.visible = idx > 0;
}

// ═══════════════════════════════════════════════════════════════════
// BLOCK SHATTER SYSTEM (NEW)
// ═══════════════════════════════════════════════════════════════════

const shatterFragments = [];

export function emitShatterBlocks(rows) {
  const step = CELL_SIZE + GAP;
  const halfCols = (COLS - 1) / 2;
  for (const row of rows) {
    const wy = ((ROWS - 1) / 2 - (row - HIDDEN_ROWS)) * step;
    for (let c = 0; c < COLS; c++) {
      const wx = (c - halfCols) * step;
      const blockType = board[row][c];
      const color = PIECE_COLORS[blockType] || 0x888888;
      // Each block shatters into 4-6 fragments
      const fragCount = 4 + Math.floor(Math.random() * 3);
      for (let f = 0; f < fragCount; f++) {
        const size = 0.15 + Math.random() * 0.25;
        const geo = new THREE.BoxGeometry(size, size, size * 0.6);
        const mat = new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.5,
          roughness: 0.5,
          metalness: 0.2,
          transparent: true,
          opacity: 1,
        });
        const mesh = new THREE.Mesh(geo, mat);
        const t = (c - (COLS - 1) / 2) / ((COLS - 1) / 2);
        const ang = Math.random() * Math.PI * 2;
        const spd = 2 + Math.abs(t) * 2 + Math.random() * 1.5;
        mesh.position.set(
          wx + (Math.random() - 0.5) * 0.2,
          wy + (Math.random() - 0.5) * 0.2,
          0
        );
        scene.add(mesh);
        shatterFragments.push({
          mesh,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd * 0.6 + 1.5 + Math.random() * 2,
          vz: (Math.random() - 0.5) * spd * 0.8,
          rvx: (Math.random() - 0.5) * 8,
          rvy: (Math.random() - 0.5) * 8,
          rvz: (Math.random() - 0.5) * 8,
          life: 0.6 + Math.random() * 0.4,
          maxLife: 1.0,
        });
      }
    }
  }
}

function updateShatterFragments(dt) {
  for (let i = shatterFragments.length - 1; i >= 0; i--) {
    const f = shatterFragments[i];
    f.life -= dt;
    if (f.life <= 0) {
      scene.remove(f.mesh);
      f.mesh.geometry.dispose();
      f.mesh.material.dispose();
      shatterFragments.splice(i, 1);
      continue;
    }
    f.vy += -6 * dt; // gravity (lighter than full gravity)
    f.vx *= 0.97;
    f.vy *= 0.97;
    f.vz *= 0.97;
    f.mesh.position.x += f.vx * dt;
    f.mesh.position.y += f.vy * dt;
    f.mesh.position.z += f.vz * dt;
    f.mesh.rotation.x += f.rvx * dt;
    f.mesh.rotation.y += f.rvy * dt;
    f.mesh.rotation.z += f.rvz * dt;
    const t = f.life / f.maxLife;
    f.mesh.material.opacity = Math.min(1, t * 2);
    // Shrink as they fade
    const s = 0.5 + 0.5 * t;
    f.mesh.scale.setScalar(s);
  }
}

// ═══════════════════════════════════════════════════════════════════
// SHOCKWAVE RING (NEW)
// ═══════════════════════════════════════════════════════════════════

const shockwaves = [];

export function emitShockwave(worldY, count = 1) {
  for (let i = 0; i < count; i++) {
    const radius = 0.5;
    const segments = 48;
    const ringGeo = new THREE.RingGeometry(radius, radius + 0.08, segments);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x88bbff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(0, worldY + (i - (count - 1) / 2) * (CELL_SIZE + GAP), 0.2);
    ring.rotation.x = -Math.PI / 2; // lay flat
    scene.add(ring);
    shockwaves.push({
      mesh: ring,
      life: 0.6,
      maxLife: 0.6,
    });
  }
}

function updateShockwaves(dt) {
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const s = shockwaves[i];
    s.life -= dt;
    const t = Math.max(0, s.life / s.maxLife);
    // Expand ring
    const r = 0.5 + (1 - t) * 8;
    s.mesh.geometry.dispose();
    s.mesh.geometry = new THREE.RingGeometry(r, r + 0.15 * (1 - t * 0.5), 48);
    s.mesh.material.opacity = t * 0.6;
    s.mesh.scale.setScalar(1);
    if (s.life <= 0) {
      scene.remove(s.mesh);
      s.mesh.geometry.dispose();
      s.mesh.material.dispose();
      shockwaves.splice(i, 1);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// BACKGROUND FLASH (NEW)
// ═══════════════════════════════════════════════════════════════════

let bgFlashIntensity = 0;

export function triggerBackgroundFlash(intensity = 0.3) {
  bgFlashIntensity = Math.max(bgFlashIntensity, intensity);
}

function updateBackgroundFlash(dt) {
  if (bgFlashIntensity <= 0) return;
  bgFlashIntensity *= 0.92;
  const t = Math.max(0, bgFlashIntensity);
  const bgColor = new THREE.Color(0x0f0f23);
  scene.background = bgColor.lerp(new THREE.Color(0x4466ff), t * 0.4);
  if (t < 0.01) {
    bgFlashIntensity = 0;
    scene.background = new THREE.Color(0x0f0f23);
  }
}

// ═══════════════════════════════════════════════════════════════════
// GLOW HALO (NEW) — soft light behind cleared rows
// ═══════════════════════════════════════════════════════════════════

const glowHalos = [];

export function emitGlowHalo(rows) {
  const step = CELL_SIZE + GAP;
  const width = COLS * step + 1;
  for (const row of rows) {
    const wy = ((ROWS - 1) / 2 - (row - HIDDEN_ROWS)) * step;
    const geo = new THREE.PlaneGeometry(width, step * 0.8);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x88ddff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, wy, -BLOCK_HEIGHT / 2 - 0.05);
    scene.add(mesh);
    glowHalos.push({
      mesh,
      life: 0.5,
      maxLife: 0.5,
    });
  }
}

function updateGlowHalos(dt) {
  for (let i = glowHalos.length - 1; i >= 0; i--) {
    const h = glowHalos[i];
    h.life -= dt;
    const t = Math.max(0, h.life / h.maxLife);
    // Fade in rapidly, then fade out slowly
    const opacity = t < 0.3 ? t / 0.3 : (1 - (t - 0.3) / 0.7) * 0.25;
    h.mesh.material.opacity = Math.max(0, opacity);
    // Slight scale pulse
    const s = 1 + (1 - t) * 0.3;
    h.mesh.scale.set(s, s, 1);
    if (h.life <= 0) {
      scene.remove(h.mesh);
      h.mesh.geometry.dispose();
      h.mesh.material.dispose();
      glowHalos.splice(i, 1);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// SCREEN SHAKE
// ═══════════════════════════════════════════════════════════════════

let shakeIntensity = 0;
let shakeDuration = 0;
const shakeDecay = 0.85;

export function triggerShake(intensity = 0.3, duration = 0.4) {
  shakeIntensity = Math.max(shakeIntensity, intensity);
  shakeDuration = Math.max(shakeDuration, duration);
}

function applyShake(dt) {
  if (shakeDuration <= 0) return;
  const ox = (Math.random() - 0.5) * 2 * shakeIntensity;
  const oy = (Math.random() - 0.5) * 2 * shakeIntensity;
  const oz = (Math.random() - 0.5) * 2 * shakeIntensity * 0.5;
  camera.position.copy(cameraBasePos).add(new THREE.Vector3(ox, oy, oz));
  camera.lookAt(0, 0, 0);
  shakeIntensity *= shakeDecay;
  shakeDuration -= dt;
  if (shakeDuration <= 0) {
    shakeIntensity = 0;
    camera.position.copy(cameraBasePos);
    camera.lookAt(0, 0, 0);
  }
}

// ═══════════════════════════════════════════════════════════════════
// BOARD <-> WORLD CONVERSION
// ═══════════════════════════════════════════════════════════════════

export function boardToWorld(row, col) {
  const x = (col - (COLS - 1) / 2) * (CELL_SIZE + GAP);
  const y = ((ROWS - 1) / 2 - (row - HIDDEN_ROWS)) * (CELL_SIZE + GAP);
  return { x, y };
}

// ═══════════════════════════════════════════════════════════════════
// BLOCK FACTORY
// ═══════════════════════════════════════════════════════════════════

export function createBlock(color, glow = false) {
  const geo = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, BLOCK_HEIGHT);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.4,
    metalness: 0.2,
    emissive: glow ? color : 0x000000,
    emissiveIntensity: glow ? 0.4 : 0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// ═══════════════════════════════════════════════════════════════════
// SYNC BOARD
// ═══════════════════════════════════════════════════════════════════

export function syncBoard(withGlow = false) {
  // Clear board group
  while (boardGroup.children.length > 0) {
    const c = boardGroup.children[0];
    boardGroup.remove(c);
    c.geometry.dispose();
    c.material.dispose();
  }

  // Draw placed blocks
  for (let r = HIDDEN_ROWS; r < ROWS + HIDDEN_ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== 0) {
        const color = PIECE_COLORS[board[r][c]] || 0x888888;
        const { x, y } = boardToWorld(r, c);
        const mesh = createBlock(color, withGlow);
        mesh.position.set(x, y, 0);
        boardGroup.add(mesh);
      }
    }
  }

  // Draw ghost piece
  while (ghostGroup.children.length > 0) {
    const c = ghostGroup.children[0];
    ghostGroup.remove(c);
    c.geometry.dispose();
    c.material.dispose();
  }

  if (currentPiece.type) {
    const ghostY = getGhostY();
    const gy = ghostY - currentPiece.y;
    const cells = getCurrentCells();
    const color = PIECE_COLORS[currentPiece.type];
    for (const [r, c] of cells) {
      const { x, y } = boardToWorld(r + gy, c);
      const geo = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, BLOCK_HEIGHT);
      const mat = new THREE.MeshStandardMaterial({
        color,
        transparent: true,
        opacity: 0.15,
        roughness: 0.5,
        metalness: 0.1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, 0);
      ghostGroup.add(mesh);
    }
  }

  // Draw current piece
  if (currentPiece.type) {
    const cells = getCurrentCells();
    const color = PIECE_COLORS[currentPiece.type];
    for (const [r, c] of cells) {
      const { x, y } = boardToWorld(r, c);
      const mesh = createBlock(color);
      mesh.position.set(x, y, 0);
      boardGroup.add(mesh);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// FLASH BLOCKS (emissive burst before clearing)
// ═══════════════════════════════════════════════════════════════════

const flashBlocks = [];

export function flashBlocksAt(rows, duration = 0.3) {
  for (let r of rows) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== 0) {
        const { x, y } = boardToWorld(r, c);
        const mesh = createBlock(PIECE_COLORS[board[r][c]], true);
        mesh.position.set(x, y, 0);
        mesh.material.emissiveIntensity = 1.5;
        boardGroup.add(mesh);
        flashBlocks.push({ mesh, life: duration, maxLife: duration });
      }
    }
  }
}

function updateFlashBlocks(dt) {
  for (let i = flashBlocks.length - 1; i >= 0; i--) {
    const fb = flashBlocks[i];
    fb.life -= dt;
    const t = Math.max(0, fb.life / fb.maxLife);
    fb.mesh.material.emissiveIntensity = t * 1.5;
    fb.mesh.material.opacity = t;
    fb.mesh.material.transparent = true;
    if (fb.life <= 0) {
      boardGroup.remove(fb.mesh);
      fb.mesh.geometry.dispose();
      fb.mesh.material.dispose();
      flashBlocks.splice(i, 1);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN UPDATE LOOP — called every frame
// ═══════════════════════════════════════════════════════════════════

let _lastTime = 0;

export function updateEffects(time) {
  const dt = Math.min((time - _lastTime) / 1000, 0.05);
  _lastTime = time;
  if (dt <= 0) return;

  updateParticles(dt);
  applyShake(dt);
  updateFlashBlocks(dt);
  updateShatterFragments(dt);
  updateShockwaves(dt);
  updateBackgroundFlash(dt);
  updateGlowHalos(dt);
}

// ═══════════════════════════════════════════════════════════════════
// RESIZE
// ═══════════════════════════════════════════════════════════════════

export function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

// ═══════════════════════════════════════════════════════════════════
// CLEANUP
// ═══════════════════════════════════════════════════════════════════

export function disposeEffects() {
  // Flash blocks
  for (const fb of flashBlocks) {
    boardGroup.remove(fb.mesh);
    fb.mesh.geometry.dispose();
    fb.mesh.material.dispose();
  }
  flashBlocks.length = 0;

  // Particles
  particles.length = 0;
  if (particleMesh) {
    scene.remove(particleMesh);
    particleMesh.geometry.dispose();
    particleMat.dispose();
    particleMesh = null;
    particleGeo = null;
    particleMat = null;
  }

  // Shatter fragments
  for (const f of shatterFragments) {
    scene.remove(f.mesh);
    f.mesh.geometry.dispose();
    f.mesh.material.dispose();
  }
  shatterFragments.length = 0;

  // Shockwaves
  for (const s of shockwaves) {
    scene.remove(s.mesh);
    s.mesh.geometry.dispose();
    s.mesh.material.dispose();
  }
  shockwaves.length = 0;

  // Glow halos
  for (const h of glowHalos) {
    scene.remove(h.mesh);
    h.mesh.geometry.dispose();
    h.mesh.material.dispose();
  }
  glowHalos.length = 0;

  shakeIntensity = 0;
  shakeDuration = 0;
  bgFlashIntensity = 0;
  scene.background = new THREE.Color(0x0f0f23);
}
