import * as THREE from 'three';

import type { SceneEvaluation } from '../core/sceneEvaluation.ts';
import { RenderGraphManager } from './renderGraph.ts';
import { applyMatrix } from './renderTransforms.ts';

export { applyMatrix };

export function buildRenderableScene(
  evaluation: SceneEvaluation,
  selectedObjectName: string | null,
  scenePath: string,
  selectedSpanName: string | null = null
) {
  const root = new THREE.Group();
  const graph = new RenderGraphManager(root, scenePath);
  graph.update(evaluation, {
    objectName: selectedObjectName,
    spanName: selectedSpanName,
  });
  return root;
}
