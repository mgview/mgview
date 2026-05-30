const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const path = require('path');

const {
  createWorkspaceRoots,
  isForbiddenWorkspacePath,
  normalizeWorkspaceRoot,
  parseApiRoot,
  resolveLogicalPathForRoot,
  resolveUrlAssetPath,
  toLogicalPathForRoot,
  usesAppRoot,
} = require('./workspaceRoots.js');

const appRoot = path.join(os.tmpdir(), 'mgview-app');
const workspaceRoot = path.join(os.tmpdir(), 'mgview-workspace');

test('parseApiRoot accepts workspace, sample, and app', () => {
  assert.equal(parseApiRoot('workspace'), 'workspace');
  assert.equal(parseApiRoot('sample'), 'sample');
  assert.equal(parseApiRoot('app'), 'app');
  assert.equal(parseApiRoot('invalid'), null);
});

test('usesAppRoot identifies bundled app URL paths', () => {
  assert.equal(usesAppRoot('samples/particle_pendulum/particle_pendulum.json'), true);
  assert.equal(usesAppRoot('assets/textures/foo.png'), true);
  assert.equal(usesAppRoot('my_sim_folder/run.1'), false);
  assert.equal(usesAppRoot('.'), false);
});

test('isForbiddenWorkspacePath rejects app-relative prefixes', () => {
  assert.equal(isForbiddenWorkspacePath('samples/foo.json'), true);
  assert.equal(isForbiddenWorkspacePath('my_sim_folder/run.1'), false);
});

test('resolveLogicalPathForRoot maps sample API paths to app samples directory', () => {
  const samplePath = resolveLogicalPathForRoot(
    'sample',
    'particle_pendulum/particle_pendulum.json',
    appRoot,
    workspaceRoot
  );
  assert.equal(
    samplePath,
    path.resolve(appRoot, 'samples/particle_pendulum/particle_pendulum.json')
  );
});

test('resolveLogicalPathForRoot maps workspace API paths to workspace root', () => {
  const simPath = resolveLogicalPathForRoot('workspace', 'my_sim_folder/run.1', appRoot, workspaceRoot);
  assert.equal(simPath, path.resolve(workspaceRoot, 'my_sim_folder/run.1'));
});

test('resolveLogicalPathForRoot rejects samples/ prefix under workspace root', () => {
  assert.equal(
    resolveLogicalPathForRoot('workspace', 'samples/default.json', appRoot, workspaceRoot),
    null
  );
});

test('resolveUrlAssetPath keeps URL routing for /mgview/samples/...', () => {
  const samplePath = resolveUrlAssetPath(
    'samples/particle_pendulum/particle_pendulum.json',
    appRoot,
    workspaceRoot
  );
  assert.equal(
    samplePath,
    path.resolve(appRoot, 'samples/particle_pendulum/particle_pendulum.json')
  );
});

test('toLogicalPathForRoot returns root-relative API paths', () => {
  const sampleFile = path.join(appRoot, 'samples', 'default.json');
  const simFile = path.join(workspaceRoot, 'my_sim_folder', 'run.1');

  assert.equal(toLogicalPathForRoot(sampleFile, 'sample', appRoot, workspaceRoot), 'default.json');
  assert.equal(toLogicalPathForRoot(simFile, 'workspace', appRoot, workspaceRoot), 'my_sim_folder/run.1');
});

test('normalizeWorkspaceRoot rejects paths inside the app install', () => {
  const normalized = normalizeWorkspaceRoot(path.join(appRoot, 'samples'), appRoot);
  assert.equal(normalized.corrected, true);
  assert.equal(normalized.workspaceRoot, path.resolve(appRoot, '..'));
});

test('createWorkspaceRoots defaults workspace to parent of app root', () => {
  const roots = createWorkspaceRoots(appRoot, null);
  assert.equal(roots.appRoot, path.resolve(appRoot));
  assert.equal(roots.workspaceRoot, path.resolve(appRoot, '..'));
});
