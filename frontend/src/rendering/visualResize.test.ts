import assert from 'node:assert/strict';
import test from 'node:test';

import { isVisualResizeSupported, resizeVisualFromScale } from './visualResize.ts';

test('box resize maps each gizmo axis to the authored size', () => {
  assert.deepEqual(
    resizeVisualFromScale(
      { type: 'box', size: { x: 2, y: 3, z: 4 } },
      { x: 2, y: 0.5, z: 1.5 }
    ),
    { size: { x: 4, y: 1.5, z: 6 } }
  );
});

test('round and uniformly-scaled visuals use the dominant changed axis', () => {
  assert.deepEqual(
    resizeVisualFromScale({ type: 'sphere', radius: 2 }, { x: 1, y: 0.5, z: 1 }),
    { radius: 1 }
  );
  assert.deepEqual(
    resizeVisualFromScale({ type: 'mesh', scale: 3 }, { x: 1, y: 1, z: 2 }),
    { scale: 6 }
  );
});

test('cylinder and cone separate radial and axial dimensions', () => {
  assert.deepEqual(
    resizeVisualFromScale({ type: 'cylinder', radius: 2, length: 5 }, { x: 1.5, y: 2, z: 1 }),
    { radius: 3, length: 10 }
  );
  assert.deepEqual(
    resizeVisualFromScale(
      { type: 'cone', radius1: 2, radius2: 1, length: 4 },
      { x: 1, y: 0.5, z: 2 }
    ),
    { radius1: 4, radius2: 2, length: 2 }
  );
});

test('grid and torus resize remain disabled', () => {
  assert.equal(isVisualResizeSupported('grid'), false);
  assert.equal(isVisualResizeSupported('torus'), false);
  assert.equal(resizeVisualFromScale({ type: 'grid' }, { x: 2, y: 2, z: 2 }), null);
});
