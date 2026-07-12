import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildScenarioFromOdeBasePath,
  buildScenarioFromSimulationDataEntry,
  detectCompletedOdeOutputs,
  discoverSimulationDataEntryFromListing,
  ensureScenarios,
  getEffectiveSimulationData,
  slugifyScenarioId,
  DEFAULT_SCENARIO_ID,
  DEFAULT_SCENARIO_LABEL,
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

test('ensureScenarios synthesizes Default from legacy scene-level simulationData', () => {
  const result = ensureScenarios({
    simulationData: ['stable/Data.2:3', 'chaotic/Data.2:3'],
  });

  assert.equal(result.scenarios.length, 1);
  assert.equal(result.scenarios[0]?.id, DEFAULT_SCENARIO_ID);
  assert.equal(result.scenarios[0]?.label, DEFAULT_SCENARIO_LABEL);
  assert.deepEqual(result.scenarios[0]?.simulationData, ['stable/Data.2:3', 'chaotic/Data.2:3']);
  assert.equal(result.activeScenario, DEFAULT_SCENARIO_ID);
});

test('ensureScenarios preserves existing scenarios and active selection', () => {
  const result = ensureScenarios({
    scenarios: [
      { id: 'stable', label: 'Stable', simulationData: ['stable/Data.2:3'] },
      { id: 'chaotic', label: 'Chaotic', simulationData: ['chaotic/Data.2:3'] },
    ],
    activeScenario: 'chaotic',
  });

  assert.equal(result.scenarios.length, 2);
  assert.equal(result.activeScenario, 'chaotic');
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

test('buildScenarioFromOdeBasePath creates unique scenario ids and uses parent folder labels', () => {
  const stable = buildScenarioFromOdeBasePath('stable/Data', 'stable/Data.2:3', []);
  const chaotic = buildScenarioFromOdeBasePath('chaotic/Data', 'chaotic/Data.2:3', [stable.id]);

  assert.equal(stable.id, 'stable');
  assert.equal(stable.label, 'Stable');
  assert.equal(chaotic.id, 'chaotic');
  assert.equal(chaotic.label, 'Chaotic');
  assert.equal(slugifyScenarioId('Chaotic ICs'), 'chaotic_ics');
});

test('buildScenarioFromSimulationDataEntry infers labels from simulation paths', () => {
  const scenario = buildScenarioFromSimulationDataEntry('chaotic/Data.2:3', []);
  assert.equal(scenario.id, 'chaotic');
  assert.equal(scenario.label, 'Chaotic');
  assert.deepEqual(scenario.simulationData, ['chaotic/Data.2:3']);
});
