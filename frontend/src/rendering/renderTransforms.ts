import * as THREE from 'three';

export function applyMatrix(group: THREE.Group, rotationMatrix: number[] | null) {
  if (!rotationMatrix) {
    group.quaternion.identity();
    return;
  }

  const matrix = new THREE.Matrix4().set(
    rotationMatrix[0], rotationMatrix[1], rotationMatrix[2], 0,
    rotationMatrix[3], rotationMatrix[4], rotationMatrix[5], 0,
    rotationMatrix[6], rotationMatrix[7], rotationMatrix[8], 0,
    0, 0, 0, 1
  );

  group.quaternion.setFromRotationMatrix(matrix);
}
