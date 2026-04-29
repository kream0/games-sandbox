import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { GRID_SIZE, BLOCK_HEIGHT } from './constants.js';

// ─── Scene ───────────────────────────────────────────────────────
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// ─── Camera ──────────────────────────────────────────────────────
export const camera = new THREE.PerspectiveCamera(
  45, window.innerWidth / window.innerHeight, 0.1, 100
);
camera.position.set(GRID_SIZE * 0.8, GRID_SIZE * 0.9, GRID_SIZE * 0.8);
camera.lookAt(0, 0, 0);

// ─── WebGL Renderer ──────────────────────────────────────────────
export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.prepend(renderer.domElement);

// ─── CSS2D Renderer (labels) ─────────────────────────────────────
export const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.left = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
document.body.prepend(labelRenderer.domElement);

// ─── Lights ──────────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0x404060, 0.6);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffeedd, 2.5);
dirLight.position.set(8, 12, 6);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 30;
dirLight.shadow.camera.left = -10;
dirLight.shadow.camera.right = 10;
dirLight.shadow.camera.top = 10;
dirLight.shadow.camera.bottom = -10;
scene.add(dirLight);

const fill = new THREE.DirectionalLight(0x8888ff, 0.5);
fill.position.set(-4, 6, -3);
scene.add(fill);

const hemi = new THREE.HemisphereLight(0x4466ff, 0x222244, 0.6);
scene.add(hemi);

// ─── Floor (fixed large size for all difficulties) ─────────────────
const MAX_SIZE = 22;
const floorGeo = new THREE.PlaneGeometry(MAX_SIZE, MAX_SIZE);
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x16213e,
  roughness: 0.8,
  metalness: 0.1,
});
export const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -BLOCK_HEIGHT / 2 - 0.05;
floor.receiveShadow = true;
scene.add(floor);

const gridHelper = new THREE.GridHelper(MAX_SIZE, MAX_SIZE, 0x333366, 0x222244);
gridHelper.position.y = -BLOCK_HEIGHT / 2 - 0.04;
scene.add(gridHelper);

// ─── Orbit Controls ──────────────────────────────────────────────
export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.minDistance = 3;
controls.maxDistance = 18;
controls.maxPolarAngle = Math.PI / 2.1;
controls.target.set(0, 0, 0);
controls.update();

// ─── Raycaster (shared) ──────────────────────────────────────────
export const raycaster = new THREE.Raycaster();
export const pointer = new THREE.Vector2();

// ─── Resize ──────────────────────────────────────────────────────
export function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  labelRenderer.setSize(w, h);
}

// ─── Update camera for current grid size ───────────────────────
export function updateCameraForSize() {
  camera.position.set(GRID_SIZE * 0.8, GRID_SIZE * 0.9, GRID_SIZE * 0.8);
  controls.maxDistance = Math.max(18, GRID_SIZE * 2.5);
  controls.update();
}
