import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSceneUrl,
  createSampleRef,
  createWorkspaceRef,
  getDefaultSceneRef,
  getSceneBasePath,
  parseSceneRefFromUrl,
  resolveApiFilePath,
  workspacePathFromInput,
} from './sceneRef.ts';

test('parseSceneRefFromUrl prefers sample over scene', () => {
  const params = new URLSearchParams('sample=default.json&scene=my_sim/foo.json');
  assert.deepEqual(parseSceneRefFromUrl(params), createSampleRef('default.json'));
});

test('parseSceneRefFromUrl maps scene param to workspace', () => {
  const params = new URLSearchParams('scene=ME328/run_01/scene.json');
  assert.deepEqual(parseSceneRefFromUrl(params), createWorkspaceRef('ME328/run_01/scene.json'));
});

test('parseSceneRefFromUrl defaults to bundled sample', () => {
  assert.deepEqual(parseSceneRefFromUrl(new URLSearchParams()), getDefaultSceneRef());
});

test('buildSceneUrl uses separate query params', () => {
  assert.equal(
    buildSceneUrl(createSampleRef('babyboot/chaotic/babyboot.json'), 'http://localhost/mgview/'),
    'http://localhost/mgview/?sample=babyboot%2Fchaotic%2Fbabyboot.json'
  );
  assert.equal(
    buildSceneUrl(createWorkspaceRef('my_sim/scene.json'), 'http://localhost/mgview/'),
    'http://localhost/mgview/?scene=my_sim%2Fscene.json'
  );
});

test('resolveApiFilePath maps sample refs under samples/', () => {
  assert.equal(
    resolveApiFilePath(createSampleRef('particle_pendulum/particle_pendulum.json')),
    'samples/particle_pendulum/particle_pendulum.json'
  );
  assert.equal(resolveApiFilePath(createWorkspaceRef('my_sim/scene.json')), 'my_sim/scene.json');
});

test('getSceneBasePath resolves simulation directories', () => {
  assert.equal(
    getSceneBasePath(createSampleRef('particle_pendulum/particle_pendulum.json')),
    'samples/particle_pendulum/'
  );
  assert.equal(getSceneBasePath(createWorkspaceRef('my_sim/scene.json')), 'my_sim/');
});

test('workspacePathFromInput rejects app-relative prefixes', () => {
  assert.equal(workspacePathFromInput('samples/foo.json'), null);
  assert.equal(workspacePathFromInput('../escape.json'), null);
  assert.equal(workspacePathFromInput('my_sim/foo.json'), 'my_sim/foo.json');
});
