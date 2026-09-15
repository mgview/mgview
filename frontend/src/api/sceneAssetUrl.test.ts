import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveSceneAssetUrl } from './sceneAssetUrl.ts';

globalThis.window = {
  location: {
    pathname: '/',
    origin: 'http://localhost',
  },
} as Window & typeof globalThis;

test('scene-relative assets resolve from the supplied scene directory', () => {
  assert.equal(
    resolveSceneAssetUrl('samples/demo/', 'textures/custom.png'),
    'http://localhost/samples/demo/textures/custom.png'
  );
  assert.equal(
    resolveSceneAssetUrl('samples/demo/', 'assets/textures/metal.jpg'),
    'http://localhost/assets/textures/metal.jpg'
  );
});
