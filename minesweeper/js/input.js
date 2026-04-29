import { GRID_SIZE, COLORS } from './constants.js';
import {
  revealed, flagged,
  isFirstClick, setFirstClick,
  isGameOver,
} from './state.js';
import { reveal, toggleFlag, chord, startTimer } from './game.js';
import { placeMines } from './grid.js';
import { cellMeshes, findCellByBlock, getAllBlockMeshes } from './cells.js';
import { camera, renderer, raycaster, pointer } from './scene.js';

// ─── Hover State ────────────────────────────────────────────────
let hoveredCell = null;

// ─── Pointer Move (hover effects) ───────────────────────────────
function onPointerMove(event) {
  if (isGameOver()) {
    clearHover();
    return;
  }

  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  // Only raycast hidden, non-flagged cells
  const meshes = getRaycastableCells();
  const intersects = raycaster.intersectObjects(meshes);

  // Reset previous hover
  clearHover();

  if (intersects.length > 0) {
    const hit = intersects[0].object;
    const cell = findCellByBlock(hit);
    if (cell && !revealed[cell.row][cell.col] && !flagged[cell.row][cell.col]) {
      hit.material.color.setHex(COLORS.hiddenHover);
      hoveredCell = cell;
      renderer.domElement.style.cursor = 'pointer';
    }
  }
}

// ─── Get only non-revealed, non-flagged cells for raycasting ────
function getRaycastableCells() {
  const meshes = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (cellMeshes[r]?.[c] && !revealed[r][c] && !flagged[r][c]) {
        meshes.push(cellMeshes[r][c].block);
      }
    }
  }
  return meshes;
}

// ─── Reset hover state ──────────────────────────────────────────
function clearHover() {
  if (hoveredCell) {
    const { row, col, block } = hoveredCell;
    if (!revealed[row][col] && !flagged[row][col]) {
      block.material.color.setHex(COLORS.hidden);
    }
    hoveredCell = null;
    renderer.domElement.style.cursor = 'default';
  }
}

// ─── Pointer Down (click handling) ──────────────────────────────
function onPointerDown(event) {
  if (isGameOver()) return;
  if (event.button !== 0 && event.button !== 2) return;

  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  // Get all cell meshes
  const meshes = getAllBlockMeshes();
  const intersects = raycaster.intersectObjects(meshes);
  if (intersects.length === 0) return;

  const hit = intersects[0].object;
  const cell = findCellByBlock(hit);
  if (!cell) return;

  const { row, col } = cell;

  if (event.button === 2) {
    // Right click: flag / unflag
    toggleFlag(row, col);
    return;
  }

  // Left click
  if (revealed[row][col]) {
    // Chording — click on a revealed number to auto-reveal
    chord(row, col);
    return;
  }

  // Reveal hidden cell
  if (flagged[row][col]) return;

  if (isFirstClick()) {
    setFirstClick(false);
    placeMines(row, col);
    startTimer();
  }

  reveal(row, col);
}

// ─── Context menu prevention ────────────────────────────────────
function onContextMenu(event) {
  event.preventDefault();
}

// ─── Initialize all input handlers ──────────────────────────────
export function initInput() {
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('contextmenu', onContextMenu);
}
