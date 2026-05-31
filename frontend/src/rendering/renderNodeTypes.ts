import * as THREE from 'three';

export type RenderEntityRef =
  | { kind: 'object'; objectName: string }
  | { kind: 'visual'; objectName: string; visualName: string }
  | { kind: 'span'; spanName: string }
  | { kind: 'span-visual'; spanName: string; visualName: string };

export function setRenderEntityRef(target: THREE.Object3D, entityRef: RenderEntityRef) {
  target.userData.renderEntityRef = entityRef;
}

export function getRenderEntityRef(target: THREE.Object3D | null | undefined): RenderEntityRef | null {
  let current: THREE.Object3D | null | undefined = target;
  while (current) {
    const entityRef = current.userData?.renderEntityRef;
    if (entityRef && typeof entityRef.kind === 'string') {
      return entityRef as RenderEntityRef;
    }
    current = current.parent;
  }

  return null;
}
