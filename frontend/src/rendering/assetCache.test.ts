import assert from 'node:assert/strict';
import test from 'node:test';

import { loadCachedAsset } from './assetCache.ts';

test('asset cache shares in-flight loads', async () => {
  const cache = new Map<string, Promise<number>>();
  let loadCount = 0;
  const load = () => {
    loadCount += 1;
    return Promise.resolve(42);
  };

  const first = loadCachedAsset(cache, 'asset', load);
  const second = loadCachedAsset(cache, 'asset', load);

  assert.equal(first, second);
  assert.equal(await second, 42);
  assert.equal(loadCount, 1);
});

test('asset cache evicts failed loads so hot-reloaded assets can be retried', async () => {
  const cache = new Map<string, Promise<number>>();
  let loadCount = 0;
  const load = () => {
    loadCount += 1;
    return loadCount === 1 ? Promise.reject(new Error('missing')) : Promise.resolve(42);
  };

  await assert.rejects(loadCachedAsset(cache, 'asset', load), /missing/);
  assert.equal(await loadCachedAsset(cache, 'asset', load), 42);
  assert.equal(loadCount, 2);
});
