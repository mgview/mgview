import * as THREE from 'three';

export const BASIS_COLORS = [0xff5d73, 0x8ce99a, 0x5ad1ff] as const;

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

  BASIS_COLORS.forEach((color, axisIndex) => {
    const direction =
      axisIndex === 0
        ? new THREE.Vector3(1, 0, 0)
        : axisIndex === 1
          ? new THREE.Vector3(0, 1, 0)
          : new THREE.Vector3(0, 0, 1);

    const arrow = new THREE.ArrowHelper(
      direction,
      new THREE.Vector3(0, 0, 0),
      scale,
      color,
      headLength,
      headWidth
    );

    group.add(arrow);
  });

  return group;
}
