import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createVisualTransformGestureCoordinator,
  type VisualTransformValue,
} from './visualTransformGesture.ts';

function transform(x: number): VisualTransformValue {
  return {
    position: { x, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
  };
}

test('a transform gesture commits its first frame and previews later frames', () => {
  const commits: VisualTransformValue[] = [];
  const previews: VisualTransformValue[] = [];
  const gesture = createVisualTransformGestureCoordinator({
    onCommit: (value) => commits.push(value),
    onPreview: (value) => previews.push(value),
  });

  gesture.begin();
  gesture.change(transform(1));
  gesture.change(transform(2));
  gesture.change(transform(3));
  gesture.end();

  assert.deepEqual(commits.map((value) => value.position.x), [1]);
  assert.deepEqual(previews.map((value) => value.position.x), [2, 3]);

  gesture.begin();
  gesture.change(transform(4));
  gesture.end();

  assert.deepEqual(commits.map((value) => value.position.x), [1, 4]);
});
