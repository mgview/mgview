import * as THREE from 'three';

export function disposeMaterial(material: THREE.Material) {
  if (material.userData.disposed) {
    return;
  }

  material.userData.disposed = true;
  if ('map' in material && material.map instanceof THREE.Texture) {
    material.map.dispose();
  }
  material.dispose();
}
