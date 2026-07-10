import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildScenarioFromOdeBasePath,
  detectCompletedOdeOutputs,
  discoverSimulationDataEntryFromListing,
  getEffectiveSimulationData,
  slugifyScenarioId,
} from './sceneScenarios.ts';

test('detectCompletedOdeOutputs finds completed ODE base paths', () => {
  const output = [
    '   (10) ODE() stable/Data',
    '% header',
    '0.000E+00  1.000E+00',
    'ODE completed in 0.12 seconds.',
    '   (20) ODE() chaotic/Data',
    'ODE completed in 0.10 seconds.',
  ].join('\n');

  assert.deepEqual(detectCompletedOdeOutputs(output), ['stable/Data', 'chaotic/Data']);
});

test('discoverSimulationDataEntryFromListing prefers animate file ranges', () => {
  const entry = discoverSimulationDataEntryFromListing('stable/Data', {
    path: 'samples/babyboot/stable',
    entries: [
      { name: 'Data.1', path: 'samples/babyboot/stable/Data.1', type: 'file' },
      { name: 'Data.2', path: 'samples/babyboot/stable/Data.2', type: 'file' },
      { name: 'Data.3', path: 'samples/babyboot/stable/Data.3', type: 'file' },
    ],
  });

  assert.equal(entry, 'stable/Data.2:3');
});

test('getEffectiveSimulationData resolves active scenario entries', () => {
  const scene = {
    scenarios: [
      { id: 'stable', label: 'Stable', simulationData: ['stable/Data.2:3'] },
      { id: 'chaotic', label: 'Chaotic', simulationData: ['chaotic/Data.2:3'] },
    ],
    activeScenario: 'chaotic',
  };

  assert.deepEqual(getEffectiveSimulationData(scene), ['chaotic/Data.2:3']);
});

test('buildScenarioFromOdeBasePath creates unique scenario ids', () => {
  const first = buildScenarioFromOdeBasePath('stable/Data', 'stable/Data.2:3', []);
  const second = buildScenarioFromOdeBasePath('stable/Data', 'stable/Data.2:4', [first.id]);

  assert.equal(first.id, 'stable_data');
  assert.equal(second.id, 'stable_data_2');
  assert.equal(slugifyScenarioId('Chaotic ICs'), 'chaotic_ics');
});
