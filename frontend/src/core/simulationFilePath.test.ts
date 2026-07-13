import assert from 'node:assert/strict';
import test from 'node:test';

import {
  defaultSimFileNameForScene,
  getSimulationSettingsRelativePath,
  validateSimFileName,
} from './simulationFilePath.ts';

test('defaultSimFileNameForScene derives a colocated .txt name from the scene path', () => {
  assert.equal(defaultSimFileNameForScene('projects/demo/my_scene.json'), 'my_scene.txt');
  assert.equal(defaultSimFileNameForScene('new_scene.json'), 'new_scene.txt');
});

test('validateSimFileName rejects unsupported simulation file names', () => {
  assert.equal(validateSimFileName(''), 'Enter a simulation file name.');
  assert.equal(validateSimFileName('child/sim.txt'), 'File names cannot include slashes.');
  assert.equal(validateSimFileName('..'), 'File names cannot include "..".');
  assert.equal(validateSimFileName('.hidden.txt'), 'File names cannot start with ".".');
  assert.equal(validateSimFileName('sim.json'), 'Simulation files must end in .al or .txt.');
  assert.equal(validateSimFileName('sim.txt'), null);
  assert.equal(validateSimFileName('sim.al'), null);
});

test('getSimulationSettingsRelativePath resolves colocated and nested simulation files', () => {
  assert.equal(
    getSimulationSettingsRelativePath('projects/demo/my_scene.json', 'projects/demo/my_scene.txt'),
    'my_scene.txt'
  );
  assert.equal(
    getSimulationSettingsRelativePath('projects/demo/my_scene.json', 'projects/shared/sim.txt'),
    '../shared/sim.txt'
  );
});
