import * as THREE from 'three';
import { isGameOver, isPaused, setPaused, ball } from './state.js';
import { movePaddle, launchBall } from './game.js';
import { renderer, camera } from './renderer.js';

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// ─── Mouse / pointer tracking ─────────────────────────────────────
export function initInput() {
  let isPointerDown = false;

  const onPointerMove = (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    // Intersect ray with z=0 plane where the board sits
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersect = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersect);

    if (intersect) {
      movePaddle(intersect.x);
    }
  };

  const onPointerDown = () => {
    isPointerDown = true;
    if (!ball.active) launchBall();
  };
  const onPointerUp = () => { isPointerDown = false; };

  const canvas = renderer.domElement;
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);

  // ─── Keyboard ────────────────────────────────────────────────
  window.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P') {
      if (!isGameOver()) setPaused(!isPaused());
    }
    if (e.key === ' ' || e.key === 'Space') {
      e.preventDefault();
      if (!ball.active) launchBall();
    }
    if ((e.key === 'r' || e.key === 'R') && isGameOver()) {
      window.dispatchEvent(new CustomEvent('restart'));
    }
  });
}
