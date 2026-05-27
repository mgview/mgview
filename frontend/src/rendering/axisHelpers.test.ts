import assert from 'node:assert/strict';
import test from 'node:test';

import { createBasis } from './axisHelpers.ts';

test('basis visuals use mesh shafts and heads instead of line arrows', () => {
  const basis = createBasis(10);

  assert.equal(basis.children.length, 3);

  for (const axisGroup of basis.children) {
    assert.equal(axisGroup.type, 'Group');
    assert.equal(axisGroup.children.length, 2);
    assert.equal(axisGroup.children[0].type, 'Mesh');
    assert.equal(axisGroup.children[1].type, 'Mesh');
    assert.equal(axisGroup.children[0].geometry.type, 'CylinderGeometry');
    assert.equal(axisGroup.children[1].geometry.type, 'ConeGeometry');
  }
});
