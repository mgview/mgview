import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import type { NormalizedSceneConfig, Vector3Like } from '../core/types.ts';
import type { SceneEvaluation } from '../core/sceneEvaluation.ts';

export interface CameraOverride {
  parentFrame: string;
  localEye: Vector3Like;
  localFocus: Vector3Like;
  localUp: Vector3Like;
}

export function sceneUpVector(scene: NormalizedSceneConfig): THREE.Vector3 {
  const up = new THREE.Vector3(
    scene.cameraUp?.[0] ?? 0,
    scene.cameraUp?.[1] ?? 1,
    scene.cameraUp?.[2] ?? 0
  );

  if (up.lengthSq() < 1e-10) {
    return new THREE.Vector3(0, 1, 0);
  }

  return up.normalize();
}

export function getSceneToCanonicalQuaternion(scene: NormalizedSceneConfig): THREE.Quaternion {
  return new THREE.Quaternion().setFromUnitVectors(
    sceneUpVector(scene),
    new THREE.Vector3(0, 1, 0)
  );
}

export function toThreeVector(value: Vector3Like): THREE.Vector3 {
  return new THREE.Vector3(value.x, value.y, value.z);
}

export function toCanonicalCamera(
  scene: NormalizedSceneConfig,
  evaluation: SceneEvaluation
) {
  const sceneToCanonical = getSceneToCanonicalQuaternion(scene);

  return {
    sceneToCanonical,
    worldUp: toThreeVector(evaluation.camera.worldUp).applyQuaternion(sceneToCanonical),
    worldEye: toThreeVector(evaluation.camera.worldEye).applyQuaternion(sceneToCanonical),
    worldFocus: toThreeVector(evaluation.camera.worldFocus).applyQuaternion(sceneToCanonical),
  };
}

function subtract(left: Vector3Like, right: Vector3Like): Vector3Like {
  return {
    x: left.x - right.x,
    y: left.y - right.y,
    z: left.z - right.z,
  };
}

function add(left: Vector3Like, right: Vector3Like): Vector3Like {
  return {
    x: left.x + right.x,
    y: left.y + right.y,
    z: left.z + right.z,
  };
}

function rotate(matrix: number[] | null, value: Vector3Like): Vector3Like {
  if (!matrix) {
    return { ...value };
  }

  return {
    x: matrix[0] * value.x + matrix[1] * value.y + matrix[2] * value.z,
    y: matrix[3] * value.x + matrix[4] * value.y + matrix[5] * value.z,
    z: matrix[6] * value.x + matrix[7] * value.y + matrix[8] * value.z,
  };
}

function inverseRotate(matrix: number[] | null, value: Vector3Like): Vector3Like {
  if (!matrix) {
    return { ...value };
  }

  return {
    x: matrix[0] * value.x + matrix[3] * value.y + matrix[6] * value.z,
    y: matrix[1] * value.x + matrix[4] * value.y + matrix[7] * value.z,
    z: matrix[2] * value.x + matrix[5] * value.y + matrix[8] * value.z,
  };
}

export function deriveCameraOverride(
  scene: NormalizedSceneConfig,
  evaluation: SceneEvaluation,
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls
): CameraOverride {
  const sceneToCanonical = getSceneToCanonicalQuaternion(scene);
  const canonicalToScene = sceneToCanonical.clone().invert();
  const sceneEye = camera.position.clone().applyQuaternion(canonicalToScene);
  const sceneFocus = controls.target.clone().applyQuaternion(canonicalToScene);
  const sceneUp = camera.up.clone().applyQuaternion(canonicalToScene).normalize();
  const parentPosition = evaluation.camera.parentPosition;
  const parentRotationMatrix = evaluation.camera.parentRotationMatrix;

  return {
    parentFrame: evaluation.camera.parentFrame,
    localEye: inverseRotate(parentRotationMatrix, subtract(sceneEye, parentPosition)),
    localFocus: inverseRotate(parentRotationMatrix, subtract(sceneFocus, parentPosition)),
    localUp: inverseRotate(parentRotationMatrix, sceneUp),
  };
}

export function toCanonicalCameraFromOverride(
  scene: NormalizedSceneConfig,
  evaluation: SceneEvaluation,
  override: CameraOverride
) {
  const sceneToCanonical = getSceneToCanonicalQuaternion(scene);
  const parentPosition = evaluation.camera.parentPosition;
  const parentRotationMatrix = evaluation.camera.parentRotationMatrix;
  const worldEye = add(parentPosition, rotate(parentRotationMatrix, override.localEye));
  const worldFocus = add(parentPosition, rotate(parentRotationMatrix, override.localFocus));
  const worldUp = rotate(parentRotationMatrix, override.localUp);

  return {
    sceneToCanonical,
    worldUp: toThreeVector(worldUp).applyQuaternion(sceneToCanonical),
    worldEye: toThreeVector(worldEye).applyQuaternion(sceneToCanonical),
    worldFocus: toThreeVector(worldFocus).applyQuaternion(sceneToCanonical),
  };
}
