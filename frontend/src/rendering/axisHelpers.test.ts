import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';

import { createBasis } from './axisHelpers.ts';

test('basis visuals use mesh shafts and heads instead of line arrows', () => {
  const basis = createBasis(10);

  assert.equal(basis.children.length, 3);

  for (const axisGroup of basis.children) {
    assert.equal(axisGroup.type, 'Group');
    assert.equal(axisGroup.children.length, 2);
    const shaft = axisGroup.children[0];
    const head = axisGroup.children[1];
    assert.ok(shaft instanceof THREE.Mesh);
    assert.ok(head instanceof THREE.Mesh);
    assert.equal(shaft.geometry.type, 'CylinderGeometry');
    assert.equal(head.geometry.type, 'ConeGeometry');
  }
});
