import * as THREE from 'three';

export const BASIS_COLORS = [0xff5d73, 0x8ce99a, 0x5ad1ff] as const;
const BASIS_DIRECTIONS = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, 0, 1),
] as const;

export function createLegacyAxes(axisLength: number, axisWidth: number) {
  const axes = new THREE.Group();
  const axisGeometry = new THREE.CylinderGeometry(1, 1, axisLength, 8, 8);

  const materials = BASIS_COLORS.map(
    (color) =>
      new THREE.MeshBasicMaterial({
        color,
      })
  );

  const xAxis = new THREE.Mesh(axisGeometry, materials[0]);
  xAxis.scale.set(axisWidth, 1, axisWidth);
  xAxis.position.x = axisLength / 2;
  xAxis.rotation.z = -Math.PI / 2;
  axes.add(xAxis);

  const yAxis = new THREE.Mesh(axisGeometry, materials[1]);
  yAxis.scale.set(axisWidth, 1, axisWidth);
  yAxis.position.y = axisLength / 2;
  axes.add(yAxis);

  const zAxis = new THREE.Mesh(axisGeometry, materials[2]);
  zAxis.scale.set(axisWidth, 1, axisWidth);
  zAxis.position.z = axisLength / 2;
  zAxis.rotation.x = -Math.PI / 2;
  axes.add(zAxis);

  return axes;
}

export function createBasis(scale: number) {
  const group = new THREE.Group();
  const headLength = scale * 0.18;
  const headWidth = scale * 0.08;
  const shaftRadius = scale * 0.02;
  const shaftLength = Math.max(scale - headLength, scale * 0.01);
  const shaftGeometry = new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftLength, 12, 1);
  const headGeometry = new THREE.ConeGeometry(headWidth, headLength, 16, 1);
  const up = new THREE.Vector3(0, 1, 0);

  BASIS_COLORS.forEach((color, axisIndex) => {
    const direction = BASIS_DIRECTIONS[axisIndex];
    const material = new THREE.MeshBasicMaterial({ color });
    const axisGroup = new THREE.Group();

    const shaft = new THREE.Mesh(shaftGeometry, material);
    shaft.position.copy(direction).multiplyScalar(shaftLength / 2);
    shaft.quaternion.setFromUnitVectors(up, direction);
    axisGroup.add(shaft);

    const head = new THREE.Mesh(headGeometry, material);
    head.position.copy(direction).multiplyScalar(shaftLength + headLength / 2);
    head.quaternion.setFromUnitVectors(up, direction);
    axisGroup.add(head);

    group.add(axisGroup);
  });

  return group;
}
