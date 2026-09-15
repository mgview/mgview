import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';

import type { SceneEvaluation } from '../core/sceneEvaluation.ts';
import { RenderGraphManager } from './renderGraph.ts';

function sphere(name: string, x: number) {
  return {
    name,
    type: 'sphere' as const,
    visible: true,
    position: { x, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    material: { name: 'SILVER' },
    radius: 1,
    segmentsWidth: 8,
    segmentsHeight: 6,
  };
}

function evaluation(): SceneEvaluation {
  return {
    objects: {
      body: {
        name: 'body',
        position: { x: 0, y: 0, z: 0 },
        rotationMatrix: null,
        visuals: [sphere('first', 1), sphere('second', 2)],
      },
    },
    camera: {
      parentFrame: 'N',
      parentPosition: { x: 0, y: 0, z: 0 },
      parentRotationMatrix: null,
      localEye: { x: 0, y: 0, z: 1 },
      localFocus: { x: 0, y: 0, z: 0 },
      localUp: { x: 0, y: 1, z: 0 },
      worldEye: { x: 0, y: 0, z: 1 },
      worldFocus: { x: 0, y: 0, z: 0 },
      worldUp: { x: 0, y: 1, z: 0 },
    },
    spans: [],
  };
}

function emissiveColor(container: THREE.Group) {
  const mesh = container.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhongMaterial>;
  return mesh.material.emissive.getHexString();
}

test('render graph exposes stable visual containers and highlights only the exact visual', () => {
  const root = new THREE.Group();
  const graph = new RenderGraphManager(root, 'samples/example.json');
  const scene = evaluation();

  graph.update(scene, {
    objectName: 'body',
    visualName: 'first',
    spanName: null,
    spanVisualName: null,
  });

  const first = graph.getVisualContainer('body', 'first');
  const second = graph.getVisualContainer('body', 'second');
  assert.ok(first);
  assert.ok(second);
  assert.notEqual(first, second);
  assert.equal(first.position.x, 1);
  assert.equal(second.position.x, 2);
  assert.equal(emissiveColor(first), '2e7dd7');
  assert.equal(emissiveColor(second), '000000');
  assert.equal(graph.getVisualContainer('body', 'missing'), null);

  graph.update(scene, {
    objectName: 'body',
    visualName: 'second',
    spanName: null,
    spanVisualName: null,
  });

  assert.equal(graph.getVisualContainer('body', 'first'), first);
  assert.equal(graph.getVisualContainer('body', 'second'), second);
  assert.equal(emissiveColor(first), '000000');
  assert.equal(emissiveColor(second), '2e7dd7');

  graph.dispose();
});

test('a null visual selection preserves whole-object selection compatibility', () => {
  const root = new THREE.Group();
  const graph = new RenderGraphManager(root, 'samples/example.json');

  graph.update(evaluation(), {
    objectName: 'body',
    visualName: null,
    spanName: null,
    spanVisualName: null,
  });

  const first = graph.getVisualContainer('body', 'first');
  const second = graph.getVisualContainer('body', 'second');
  assert.ok(first);
  assert.ok(second);
  assert.equal(emissiveColor(first), '2e7dd7');
  assert.equal(emissiveColor(second), '2e7dd7');

  graph.dispose();
});
