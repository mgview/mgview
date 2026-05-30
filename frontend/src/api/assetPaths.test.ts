import assert from 'node:assert/strict';
import test from 'node:test';

import { getAppMountPrefix, resolveBundledAssetUrl } from './assetPaths.ts';

test('resolveBundledAssetUrl includes /mgview/ mount when app is served there', () => {
  globalThis.window = {
    location: {
      pathname: '/mgview/',
      origin: 'http://localhost:8000',
    },
  } as Window & typeof globalThis;

  assert.equal(getAppMountPrefix(), '/mgview/');
  assert.equal(
    resolveBundledAssetUrl('assets/textures/metal.jpg'),
    'http://localhost:8000/mgview/assets/textures/metal.jpg'
  );
});
