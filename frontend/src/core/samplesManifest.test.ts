import assert from 'node:assert/strict';
import test from 'node:test';

import { getDefaultSampleSceneRef, getSamplesManifest, groupSampleScenes } from './samplesManifest.ts';
import { DEFAULT_SAMPLE_SCENE_PATH } from './sceneRef.ts';

test('samples manifest includes the default gallery scene', () => {
  const manifest = getSamplesManifest();
  assert.equal(manifest.version, 1);
  assert.ok(manifest.scenes.some((entry) => entry.path === DEFAULT_SAMPLE_SCENE_PATH));
});

test('getDefaultSampleSceneRef uses particle pendulum when present', () => {
  assert.equal(getDefaultSampleSceneRef().path, DEFAULT_SAMPLE_SCENE_PATH);
});

test('groupSampleScenes preserves manifest groups', () => {
  const grouped = groupSampleScenes();
  assert.ok(grouped.some(([groupName]) => groupName === 'Basics'));
  assert.ok(grouped.some(([, entries]) => entries.some((entry) => entry.label === 'Particle Pendulum')));
});
