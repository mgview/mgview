import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getDefaultSampleSceneRef,
  getSampleThumbnailRelativePath,
  getSamplesManifest,
  groupSampleScenes,
} from './samplesManifest.ts';
import { DEFAULT_SAMPLE_SCENE_PATH } from './sceneRef.ts';

test('samples manifest includes the default gallery scene', () => {
  const manifest = getSamplesManifest();
  assert.equal(manifest.version, 1);
  assert.ok(manifest.scenes.some((entry) => entry.path === DEFAULT_SAMPLE_SCENE_PATH));
});

test('getDefaultSampleSceneRef uses particle pendulum when present', () => {
  assert.equal(getDefaultSampleSceneRef().path, DEFAULT_SAMPLE_SCENE_PATH);
});

test('getSampleThumbnailRelativePath uses preview.webp beside the scene file', () => {
  assert.equal(
    getSampleThumbnailRelativePath({
      group: 'Motion Genesis Examples',
      label: 'Particle Pendulum',
      path: 'particle_pendulum/particle_pendulum.json',
    }),
    'particle_pendulum/preview.webp'
  );
});

test('getSampleThumbnailRelativePath honors explicit thumbnail overrides', () => {
  assert.equal(
    getSampleThumbnailRelativePath({
      group: 'Other',
      label: 'Custom',
      path: 'foo/bar.json',
      thumbnail: 'foo/custom-thumb.webp',
    }),
    'foo/custom-thumb.webp'
  );
});

test('groupSampleScenes preserves manifest groups', () => {
  const grouped = groupSampleScenes();
  assert.ok(grouped.some(([groupName]) => groupName === 'Motion Genesis Examples'));
  assert.ok(grouped.some(([, entries]) => entries.some((entry) => entry.label === 'Particle Pendulum')));
});
