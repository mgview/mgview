import assert from 'node:assert/strict';
import test from 'node:test';

import { buildRenderableScene } from './sceneGraph.ts';

test('renderable scene includes line span renderables', () => {
  globalThis.window = {
    location: {
      pathname: '/mgview/',
      origin: 'http://localhost:8000',
    },
  } as Window & typeof globalThis;

  const renderRoot = buildRenderableScene(
    {
      objects: {},
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
      spans: [
        {
          name: 'cable1.wire1',
          kind: 'line',
          visible: true,
          material: { name: 'BLACK' },
          width: 1,
          lineStyle: 'solid',
          start: { x: 1, y: 2, z: 3 },
          end: { x: 4, y: 5, z: 6 },
        },
      ],
    },
    null,
    'samples/example.json'
  );

  assert.equal(renderRoot.children.length, 1);
  assert.equal(renderRoot.children[0].type, 'Line');
  assert.equal(renderRoot.children[0].userData.kind, 'span-line');
});
