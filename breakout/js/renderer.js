import {
  COLS, ROWS,
  BRICK_WIDTH, BRICK_HEIGHT, BRICK_DEPTH, GAP,
  PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_DEPTH,
  BALL_RADIUS, CAMERA_Z,
  BRICK_COLORS, PADDLE_COLOR, BALL_COLOR,
} from './constants.js';
import {
  bricks,
  paddleX, ball,
} from './state.js';

// ─── Scene ────────────────────────────────────────────────────────
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0b1e);

const ASPECT = window.innerWidth / window.innerHeight;
export const camera = new THREE.PerspectiveCamera(40, ASPECT, 0.1, 60);
camera.position.set(0, 0, CAMERA_Z);
camera.lookAt(0, 0, 0);
const cameraBasePos = camera.position.clone();

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

const keyLight = new THREE.DirectionalLight(0xffeedd, 2.5);
keyLight.position.set(8, 10, 8);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 1024;
keyLight.shadow.mapSize.height = 1024;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 30;
keyLight.shadow.camera.left = -10;
keyLight.shadow.camera.right = 10;
keyLight.shadow.camera.top = 12;
keyLight.shadow.camera.bottom = -12;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x8888ff, 0.4);
fillLight.position.set(-4, 2, -5);
scene.add(fillLight);

const hemi = new THREE.HemisphereLight(0x4466ff, 0x222244, 0.3);
scene.add(hemi);

// ─── Backdrop wall ────────────────────────────────────────────────
const wallW = COLS * (BRICK_WIDTH + GAP) + 3;
const wallH = ROWS * (BRICK_HEIGHT + GAP) + 10;
const wallGeo = new THREE.PlaneGeometry(wallW, wallH);
const wallMat = new THREE.MeshStandardMaterial({
  color: 0x0a0a1a,
  roughness: 0.9,
  metalness: 0.05,
  side: THREE.DoubleSide,
});
const wall = new THREE.Mesh(wallGeo, wallMat);
wall.position.set(0, 0, -BRICK_DEPTH / 2 - 0.1);
scene.add(wall);

// ─── Board Group ──────────────────────────────────────────────────
export const boardGroup = new THREE.Group();
scene.add(boardGroup);

// ─── Brick references (for effects) ───────────────────────────────
const brickMeshes = []; // { mesh, row, col }

// ─── Paddle ───────────────────────────────────────────────────────
const paddleGeo = new THREE.BoxGeometry(PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_DEPTH);
const paddleMat = new THREE.MeshStandardMaterial({
  color: PADDLE_COLOR,
  roughness: 0.3,
  metalness: 0.3,
  emissive: PADDLE_COLOR,
  emissiveIntensity: 0.2,
});
export const paddleMesh = new THREE.Mesh(paddleGeo, paddleMat);
paddleMesh.position.set(0, -7.5, 0);
paddleMesh.castShadow = true;
paddleMesh.receiveShadow = true;
boardGroup.add(paddleMesh);

// ─── Ball ─────────────────────────────────────────────────────────
const ballGeo = new THREE.SphereGeometry(BALL_RADIUS, 16, 16);
const ballMat = new THREE.MeshStandardMaterial({
  color: BALL_COLOR,
  roughness: 0.1,
  metalness: 0.2,
  emissive: BALL_COLOR,
  emissiveIntensity: 0.1,
});
export const ballMesh = new THREE.Mesh(ballGeo, ballMat);
ballMesh.castShadow = true;
boardGroup.add(ballMesh);

// ─── Bounds (for visual reference, 3 walls) ──────────────────────
const halfW = (COLS * (BRICK_WIDTH + GAP) - GAP) / 2;
const halfH = (ROWS * (BRICK_HEIGHT + GAP) - GAP) / 2;
const boundsW = halfW + 0.5;
const boundsH = halfH + 5;

function buildBounds() {
  const pts = [];
  // Top
  pts.push(new THREE.Vector3(-boundsW, boundsH, 0));
  pts.push(new THREE.Vector3(boundsW, boundsH, 0));
  // Left
  pts.push(new THREE.Vector3(-boundsW, boundsH, 0));
  pts.push(new THREE.Vector3(-boundsW, -7.8, 0));
  // Right
  pts.push(new THREE.Vector3(boundsW, boundsH, 0));
  pts.push(new THREE.Vector3(boundsW, -7.8, 0));

  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({
    color: 0x2a2a5a,
    transparent: true,
    opacity: 0.4,
  });
  const lines = new THREE.LineSegments(geo, mat);
  boardGroup.add(lines);
}
buildBounds();

// ═══════════════════════════════════════════════════════════════════
// BRICK RENDERING
// ═══════════════════════════════════════════════════════════════════

export function syncBricks() {
  // Remove old brick meshes
  for (const ref of brickMeshes) {
    boardGroup.remove(ref.mesh);
    ref.mesh.geometry.dispose();
    ref.mesh.material.dispose();
  }
  brickMeshes.length = 0;

  const w = BRICK_WIDTH;
  const h = BRICK_HEIGHT;
  const step = w + GAP;
  const halfCols = (COLS - 1) / 2;
  const startY = (ROWS - 1) * step / 2;
  const geo = new THREE.BoxGeometry(w, h, BRICK_DEPTH);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!bricks[r][c]) continue;
      const color = BRICK_COLORS[r];
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.4,
        metalness: 0.2,
        emissive: color,
        emissiveIntensity: 0.15,
      });
      const mesh = new THREE.Mesh(geo.clone(), mat);
      const x = (c - halfCols) * step;
      const y = startY - r * step;
      mesh.position.set(x, y, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      boardGroup.add(mesh);
      brickMeshes.push({ mesh, row: r, col: c });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// SYNC (paddle + ball)
// ═══════════════════════════════════════════════════════════════════

export function sync() {
  paddleMesh.position.x = paddleX;
  ballMesh.position.set(ball.x, ball.y, 0);
  ballMesh.visible = ball.active;
}

// ═══════════════════════════════════════════════════════════════════
// PARTICLE SYSTEM (brick break)
// ═══════════════════════════════════════════════════════════════════

const MAX_PARTICLES = 300;
const particles = [];
let particleMesh = null;
let particleGeo = null;
let particleMat = null;

function ensureParticles() {
  if (!particleMesh) {
    particleGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
    particleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    particleMesh = new THREE.InstancedMesh(particleGeo, particleMat, MAX_PARTICLES);
    particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    particleMesh.count = 0;
    particleMesh.visible = false;
    scene.add(particleMesh);
  }
}

const pDummy = new THREE.Object3D();

export function emitBrickBreakParticles(worldX, worldY, color, count = 8) {
  ensureParticles();
  const c = new THREE.Color(color);
  for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 1 + Math.random() * 2.5;
    particles.push({
      x: worldX + (Math.random() - 0.5) * 0.2,
      y: worldY + (Math.random() - 0.5) * 0.2,
      z: 0,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd + 1.5,
      vz: (Math.random() - 0.5) * 1.5,
      life: 0.8 + Math.random() * 0.4,
      maxLife: 1.2,
      color: c,
      size: 0.04 + Math.random() * 0.08,
      rx: Math.random() * 6,
      ry: Math.random() * 6,
      rz: Math.random() * 6,
      rvx: (Math.random() - 0.5) * 10,
      rvy: (Math.random() - 0.5) * 10,
      rvz: (Math.random() - 0.5) * 10,
    });
  }
}

function updateParticles(dt) {
  ensureParticles();
  let idx = 0;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.vx *= 0.96;
    p.vy += -8 * dt;
    p.vz *= 0.96;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.rx += p.rvx * dt;
    p.ry += p.rvy * dt;
    p.rz += p.rvz * dt;
    const t = p.life / p.maxLife;
    pDummy.position.set(p.x, p.y, p.z);
    const s = p.size * (0.2 + 0.8 * t);
    pDummy.scale.set(s, s, s);
    pDummy.rotation.set(p.rx, p.ry, p.rz);
    pDummy.updateMatrix();
    particleMesh.setMatrixAt(idx, pDummy.matrix);
    particleMesh.setColorAt(idx, p.color);
    idx++;
  }
  particleMesh.count = idx;
  particleMesh.instanceMatrix.needsUpdate = true;
  if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
  particleMesh.visible = idx > 0;
}

// ═══════════════════════════════════════════════════════════════════
// SCREEN SHAKE
// ═══════════════════════════════════════════════════════════════════

let shakeIntensity = 0;
let shakeDuration = 0;

export function triggerShake(intensity = 0.2, duration = 0.3) {
  shakeIntensity = Math.max(shakeIntensity, intensity);
  shakeDuration = Math.max(shakeDuration, duration);
}

function applyShake(dt) {
  if (shakeDuration <= 0) return;
  const ox = (Math.random() - 0.5) * 2 * shakeIntensity;
  const oy = (Math.random() - 0.5) * 2 * shakeIntensity;
  camera.position.copy(cameraBasePos).add(new THREE.Vector3(ox, oy, 0));
  camera.lookAt(0, 0, 0);
  shakeIntensity *= 0.85;
  shakeDuration -= dt;
  if (shakeDuration <= 0) {
    shakeIntensity = 0;
    camera.position.copy(cameraBasePos);
    camera.lookAt(0, 0, 0);
  }
}

// ═══════════════════════════════════════════════════════════════════
// BACKGROUND FLASH
// ═══════════════════════════════════════════════════════════════════

let bgFlash = 0;

export function triggerBgFlash(intensity = 0.2) {
  bgFlash = Math.max(bgFlash, intensity);
}

function updateBgFlash(dt) {
  if (bgFlash <= 0) return;
  bgFlash *= 0.9;
  const t = Math.max(0, bgFlash);
  const bg = new THREE.Color(0x0b0b1e);
  scene.background = bg.lerp(new THREE.Color(0x4466aa), t * 0.3);
  if (t < 0.01) { bgFlash = 0; scene.background = new THREE.Color(0x0b0b1e); }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN UPDATE
// ═══════════════════════════════════════════════════════════════════

let _lastTime = 0;

export function updateEffects(time) {
  const dt = Math.min((time - _lastTime) / 1000, 0.05);
  _lastTime = time;
  if (dt <= 0) return;
  updateParticles(dt);
  applyShake(dt);
  updateBgFlash(dt);
}

// ═══════════════════════════════════════════════════════════════════
// CLEANUP
// ═══════════════════════════════════════════════════════════════════

export function disposeEffects() {
  particles.length = 0;
  if (particleMesh) {
    scene.remove(particleMesh);
    particleMesh.geometry.dispose();
    particleMat.dispose();
    particleMesh = null; particleGeo = null; particleMat = null;
  }
  for (const ref of brickMeshes) {
    boardGroup.remove(ref.mesh);
    ref.mesh.geometry.dispose();
    ref.mesh.material.dispose();
  }
  brickMeshes.length = 0;
  shakeIntensity = 0; shakeDuration = 0;
  bgFlash = 0;
  scene.background = new THREE.Color(0x0b0b1e);
}
