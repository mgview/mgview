import * as THREE from 'three';
import type { TransformControls } from 'three/addons/controls/TransformControls.js';

type TransformControlsInternals = TransformControls & {
  _gizmo: {
    gizmo: Record<string, THREE.Object3D>;
    picker: Record<string, THREE.Object3D>;
  };
};

function geometryCenter(object: THREE.Object3D, axis: 'x' | 'y' | 'z') {
  if (!(object instanceof THREE.Mesh)) {
    return null;
  }

  object.geometry.computeBoundingBox();
  const box = object.geometry.boundingBox;
  if (!box) {
    return null;
  }

  return (box.min[axis] + box.max[axis]) / 2;
}

/** Match frame_viz's one-ended move arrows and shorter negative-axis pick regions. */
export function customizeTranslationGizmo(transformControls: TransformControls) {
  const { gizmo, picker } = (transformControls as TransformControlsInternals)._gizmo;
  const translateGizmo = gizmo.translate;
  const translatePicker = picker.translate;
  if (!translateGizmo || !translatePicker) {
    return;
  }

  for (const axis of ['X', 'Y', 'Z'] as const) {
    const component = axis.toLowerCase() as 'x' | 'y' | 'z';
    const negativeArrow = translateGizmo.children.find((child) => {
      if (child.name !== axis || !(child instanceof THREE.Mesh)) {
        return false;
      }

      const parameters = (child.geometry as THREE.CylinderGeometry).parameters;
      const isArrow = parameters?.radiusTop === 0 || parameters?.radiusBottom === 0;
      const center = geometryCenter(child, component);
      return isArrow && center !== null && center < 0;
    });
    if (negativeArrow) {
      translateGizmo.remove(negativeArrow);
      (negativeArrow as THREE.Mesh).geometry.dispose();
    }

    const negativePicker = translatePicker.children.find((child) => {
      const center = child.name === axis ? geometryCenter(child, component) : null;
      return center !== null && center < 0;
    });
    if (negativePicker instanceof THREE.Mesh) {
      const scale = new THREE.Vector3(0.65, 0.65, 0.65);
      scale[component] = 0.5;
      negativePicker.geometry.scale(scale.x, scale.y, scale.z);
      negativePicker.geometry.computeBoundingBox();
      negativePicker.geometry.computeBoundingSphere();
    }
  }
}
