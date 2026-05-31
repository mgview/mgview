import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';

import { computeText2dPlaneSize, createVisualMesh } from './meshFactory.ts';

const TEXT_CANVAS_FONT_SIZE = 96;
const TEXT_CANVAS_HEIGHT = 160;

test('3d text geometry stays centered when scaled', () => {
  const mesh = createVisualMesh(
    {
      name: 'label',
      type: 'text',
      visible: true,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      material: { name: 'BLACK' },
      text: 'Base',
      scale: 1.25,
      textMode: '3d',
    },
    {
      resolveSceneAssetUrl: (assetPath) => assetPath,
    }
  );

  assert.ok(mesh instanceof THREE.Mesh);

  mesh.updateMatrixWorld(true);
  const worldBounds = new THREE.Box3().setFromObject(mesh);
  const worldCenter = new THREE.Vector3();
  worldBounds.getCenter(worldCenter);

  assert.ok(Math.abs(worldCenter.x) < 1e-5);
  assert.ok(Math.abs(worldCenter.y) < 1e-5);
  assert.ok(Math.abs(worldCenter.z) < 1e-5);

  mesh.geometry.dispose();
  if (Array.isArray(mesh.material)) {
    for (const material of mesh.material) {
      material.dispose();
    }
  } else {
    mesh.material.dispose();
  }
});

test('2d text plane maps glyph height to scale like 3d text', () => {
  const scale = 1.25;
  const glyphHeight = TEXT_CANVAS_FONT_SIZE;
  const canvasWidth = 240;
  const planeSize = computeText2dPlaneSize(canvasWidth, TEXT_CANVAS_HEIGHT, glyphHeight, scale);
  const effectiveGlyphHeight = planeSize.height * (glyphHeight / TEXT_CANVAS_HEIGHT);
  assert.equal(effectiveGlyphHeight, scale);

  const mesh3d = createVisualMesh(
    {
      name: 'label',
      type: 'text',
      visible: true,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      material: { name: 'BLACK' },
      text: 'Base',
      scale,
      textMode: '3d',
    },
    {
      resolveSceneAssetUrl: (assetPath) => assetPath,
    }
  );

  assert.ok(mesh3d instanceof THREE.Mesh);
  mesh3d.updateMatrixWorld(true);
  const height3d = new THREE.Box3().setFromObject(mesh3d).getSize(new THREE.Vector3()).y;
  assert.ok(Math.abs(height3d - scale) / scale < 0.15);

  mesh3d.geometry.dispose();
  if (Array.isArray(mesh3d.material)) {
    for (const material of mesh3d.material) {
      material.dispose();
    }
  } else {
    mesh3d.material.dispose();
  }
});
