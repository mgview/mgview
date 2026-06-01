import * as THREE from 'three';

import { getRenderEntityRef, type RenderEntityRef } from './renderNodeTypes.ts';

export function pickRenderEntity(
  event: MouseEvent,
  domElement: HTMLCanvasElement,
  camera: THREE.Camera,
  raycaster: THREE.Raycaster,
  sceneRoot: THREE.Object3D
): RenderEntityRef | null {
  const bounds = domElement.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) {
    return null;
  }

  const pointer = new THREE.Vector2(
    ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
    -((event.clientY - bounds.top) / bounds.height) * 2 + 1
  );

  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObjects(sceneRoot.children, true);

  for (const intersection of intersections) {
    const entityRef = getRenderEntityRef(intersection.object);
    if (entityRef) {
      return entityRef;
    }
  }

  return null;
}
