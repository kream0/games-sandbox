import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import {
  GRID_SIZE, CELL_SIZE, GAP, BLOCK_HEIGHT,
  RAISED_HEIGHT, COLORS,
} from './constants.js';
import { board, revealed, flagged } from './state.js';
import { scene } from './scene.js';

// ─── Cell mesh storage ──────────────────────────────────────────
export let cellMeshes = [];

// ─── Build all 3D cells ─────────────────────────────────────────
export function buildScene() {
  disposeAllCells();
  cellMeshes = [];

  const half = (GRID_SIZE - 1) / 2;

  for (let r = 0; r < GRID_SIZE; r++) {
    cellMeshes[r] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      const group = new THREE.Group();
      const x = (c - half) * (CELL_SIZE + GAP);
      const z = (r - half) * (CELL_SIZE + GAP);
      group.position.set(x, 0, z);

      // --- Block ---
      const geo = new THREE.BoxGeometry(CELL_SIZE, BLOCK_HEIGHT, CELL_SIZE);
      const mat = new THREE.MeshStandardMaterial({
        color: COLORS.hidden,
        roughness: 0.5,
        metalness: 0.15,
      });
      const block = new THREE.Mesh(geo, mat);
      block.position.y = BLOCK_HEIGHT / 2;
      block.castShadow = true;
      block.receiveShadow = true;
      block.userData.isBlock = true;
      group.add(block);

      // --- Label (CSS2D) ---
      const labelDiv = document.createElement('div');
      labelDiv.style.color = '#fff';
      labelDiv.style.fontSize = '28px';
      labelDiv.style.fontWeight = '800';
      labelDiv.style.textShadow = '0 2px 8px rgba(0,0,0,0.6)';
      labelDiv.style.pointerEvents = 'none';
      labelDiv.style.fontFamily = 'Segoe UI, sans-serif';
      labelDiv.textContent = '';

      const label = new CSS2DObject(labelDiv);
      label.position.set(0, BLOCK_HEIGHT / 2 + 0.05, 0);
      group.add(label);

      scene.add(group);
      cellMeshes[r][c] = { group, block, label, row: r, col: c };
    }
  }
}

// ─── Dispose old cells (prevent memory leak) ─────────────────────
function disposeAllCells() {
  for (let r = 0; r < cellMeshes.length; r++) {
    for (let c = 0; c < (cellMeshes[r] || []).length; c++) {
      const cell = cellMeshes[r][c];
      if (!cell) continue;
      scene.remove(cell.group);
      cell.block.geometry.dispose();
      cell.block.material.dispose();
    }
  }
}

// ─── Update a single cell's appearance ──────────────────────────
export function updateCellVisual(r, c) {
  const cell = cellMeshes[r]?.[c];
  if (!cell) return;
  const { block, label } = cell;
  const val = board[r][c];
  const isRev = revealed[r][c];
  const isFlag = flagged[r][c];
  const labelDiv = label.element;

  if (isRev) {
    if (val === -1) {
      // Mine
      block.material.color.setHex(COLORS.mine);
      labelDiv.textContent = '💣';
      labelDiv.style.fontSize = '28px';
      block.position.y = RAISED_HEIGHT;
      animateBump(block);
    } else {
      block.material.color.setHex(COLORS.revealed);
      block.position.y = RAISED_HEIGHT;
      if (val > 0) {
        labelDiv.textContent = val;
        const hexStr = '#' + new THREE.Color(COLORS[val]).getHexString();
        labelDiv.style.color = hexStr;
        labelDiv.style.fontSize = '28px';
      } else {
        labelDiv.textContent = '';
      }
    }
    block.material.transparent = true;
    block.material.opacity = 0.85;
    block.material.roughness = 0.8;
  } else if (isFlag) {
    block.material.color.setHex(COLORS.flag);
    labelDiv.textContent = '🚩';
    labelDiv.style.fontSize = '28px';
    block.position.y = BLOCK_HEIGHT / 2;
    block.material.transparent = false;
    block.material.opacity = 1;
    block.material.roughness = 0.5;
    animateFlag(block);
  } else {
    block.material.color.setHex(COLORS.hidden);
    labelDiv.textContent = '';
    block.position.y = BLOCK_HEIGHT / 2;
    block.material.transparent = false;
    block.material.opacity = 1;
    block.material.roughness = 0.5;
  }
  block.material.needsUpdate = true;
}

// ─── Bump animation on mine hit ──────────────────────────────────
function animateBump(block) {
  const origScale = block.scale.clone();
  block.scale.set(1.2, 1.2, 1.2);
  setTimeout(() => { block.scale.copy(origScale); }, 200);
}

// ─── Flag placement bounce ──────────────────────────────────────
function animateFlag(block) {
  const origY = block.position.y;
  block.position.y = origY + 0.15;
  setTimeout(() => { block.position.y = origY; }, 120);
}

// ─── Get all block meshes (for raycasting) ─────────────────────
export function getAllBlockMeshes() {
  const meshes = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (cellMeshes[r]?.[c]) {
        meshes.push(cellMeshes[r][c].block);
      }
    }
  }
  return meshes;
}

// ─── Find cell by block mesh ────────────────────────────────────
export function findCellByBlock(block) {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = cellMeshes[r]?.[c];
      if (cell && cell.block === block) return cell;
    }
  }
  return null;
}
