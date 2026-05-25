import * as THREE from 'three';

import { getServerRootPrefix } from '../api/localFiles.ts';
import type { SceneEvaluation } from '../core/sceneEvaluation.ts';
import { getBasePath, normalizePathSeparators } from '../core/pathUtils.ts';
import { createCableSpan, createVisualMesh } from './meshFactory.ts';
import { toThreeVector } from './coordinateConvention.ts';

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

export function buildRenderableScene(
  evaluation: SceneEvaluation,
  selectedObjectName: string | null,
  scenePath: string
) {
  const root = new THREE.Group();
  const sceneBasePath = getBasePath(scenePath);
  const assetContext = {
    resolveSceneAssetUrl(assetPath: string) {
      const normalizedAssetPath = normalizePathSeparators(assetPath).replace(/^\/+/, '');
      if (normalizedAssetPath.startsWith('app/')) {
        return new URL(`${getServerRootPrefix()}${normalizedAssetPath}`, window.location.origin).toString();
      }

      const baseUrl = new URL(`${getServerRootPrefix()}${normalizePathSeparators(sceneBasePath)}`, window.location.origin);
      return new URL(normalizedAssetPath, baseUrl).toString();
    },
  };

  for (const [objectName, snapshot] of Object.entries(evaluation.objects)) {
    const objectGroup = new THREE.Group();
    objectGroup.position.copy(toThreeVector(snapshot.position));
    applyMatrix(objectGroup, snapshot.rotationMatrix);

    for (const visual of snapshot.visuals) {
      if (!visual.visible) {
        continue;
      }

      const visualNode = createVisualMesh(visual, {
        ...assetContext,
        highlightSelection: objectName === selectedObjectName,
      });
      if (!visualNode) {
        continue;
      }

      visualNode.position.copy(toThreeVector(visual.position));
      visualNode.rotation.set(visual.rotation.x, visual.rotation.y, visual.rotation.z);

      objectGroup.add(visualNode);
    }

    if (objectGroup.children.length > 0) {
      root.add(objectGroup);
    }
  }

  for (const span of evaluation.spans) {
    if (!span.visible) {
      continue;
    }

    root.add(createCableSpan(span));
  }

  return root;
}
