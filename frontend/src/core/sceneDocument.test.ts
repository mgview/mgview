import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { createSceneDocument } from './sceneDocument.ts';
import { buildObjectInspections, collectSceneDiagnostics } from './sceneInspector.ts';
import { expandSimulationFiles } from './expandSimulationFiles.ts';
import { getBasePath, getFileExtension, getRelativePath } from './pathUtils.ts';
import type { SceneConfig } from './types.ts';

async function readSceneFixture(relativePath: string): Promise<SceneConfig> {
  const url = new URL(`../../../samples/${relativePath}`, import.meta.url);
  const text = await readFile(url, 'utf8');
  return JSON.parse(text) as SceneConfig;
}

test('path helpers preserve MGView-style relative paths', () => {
  assert.equal(getBasePath('samples/tricycle/tricycle.json'), 'samples/tricycle/');
  assert.equal(getBasePath('tricycle.json'), '');
  assert.equal(getFileExtension('samples\\tricycle\\tricycle.JSON'), 'json');
  assert.equal(
    getRelativePath('samples/tricycle/', 'samples/common/demo.1'),
    '../common/demo.1'
  );
});

test('simulation file expansion matches legacy numeric range behavior', () => {
  assert.deepEqual(
    expandSimulationFiles(['particle_pendulum.1:3'], 'samples/particle_pendulum/'),
    [
      'samples/particle_pendulum/particle_pendulum.1',
      'samples/particle_pendulum/particle_pendulum.2',
      'samples/particle_pendulum/particle_pendulum.3',
    ]
  );

  assert.deepEqual(
    expandSimulationFiles(['VehicleTricycleFreeMotionBackwardForces.2:4']),
    [
      'VehicleTricycleFreeMotionBackwardForces.2',
      'VehicleTricycleFreeMotionBackwardForces.3',
      'VehicleTricycleFreeMotionBackwardForces.4',
    ]
  );
});

test('scene normalization adds legacy defaults and generated visuals', async () => {
  const scene = await readSceneFixture('default.json');
  const document = createSceneDocument(scene);

  assert.equal(document.newtonianFrame, 'N');
  assert.equal(document.sceneOrigin, 'No');
  assert.equal(document.backgroundColor, '#e0f0ff');
  assert.equal(document.cameraParentFrame, 'N');
  assert.ok(document.objects.N);
  assert.equal(document.objects.N.type, 'frame');
  assert.ok(document.objects.N.visual?.label);
  assert.ok(document.objects.N.visual?.basis);
});

test('channel inference promotes frames and adds missing points', async () => {
  const scene = await readSceneFixture('default.json');
  const document = createSceneDocument(scene, [
    'P_No_Q[1]',
    'P_No_Q[2]',
    'P_No_Q[3]',
    'N_A[1,1]',
  ]);

  assert.equal(document.objects.Q.type, 'point');
  assert.equal(document.objects.A.type, 'frame');
});

test('scene inspector surfaces inferred objects and default visuals', async () => {
  const scene = await readSceneFixture('default.json');
  const document = createSceneDocument(scene, [
    'P_No_Q[1]',
    'P_No_Q[2]',
    'P_No_Q[3]',
  ]);

  const inspections = buildObjectInspections(scene, document, ['P_No_Q[1]']);
  const diagnostics = collectSceneDiagnostics(scene, document, ['samples/default.1'], ['P_No_Q[1]']);
  const qObject = inspections.find((entry) => entry.name === 'Q');
  const nObject = inspections.find((entry) => entry.name === 'N');
  const nLabel = nObject?.visuals.find((visual) => visual.name === 'label');

  assert.ok(qObject);
  assert.equal(qObject.inferred, true);
  assert.equal(qObject.missingSimulationData, false);
  assert.ok(nObject?.visuals.some((visual) => visual.tags.includes('default label')));
  assert.ok(nLabel?.propertySummary.some((property) => property.key === 'text' && property.value === 'N'));
  assert.ok(diagnostics.some((diagnostic) => diagnostic.message.includes('Inferred')));
});

test('scene inspector warns about mixed origins and objects missing sim data', async () => {
  const scene = {
    ...(await readSceneFixture('default.json')),
    objects: {
      N: { type: 'frame', visual: {} },
      Ghost: {
        type: 'frame',
        visual: {
          marker: {
            type: 'sphere',
            radius: 0.25,
          },
        },
      },
    },
  };
  const document = createSceneDocument(scene, [
    'P_No_Q[1]',
    'P_Ao_R[1]',
    'P_Ao_R[2]',
    'P_Ao_R[3]',
  ]);
  const inspections = buildObjectInspections(scene, document, ['P_No_Q[1]', 'P_Ao_R[1]', 'P_Ao_R[2]', 'P_Ao_R[3]']);
  const diagnostics = collectSceneDiagnostics(
    scene,
    document,
    ['samples/default.1', 'samples/default.2'],
    ['P_No_Q[1]', 'P_Ao_R[1]', 'P_Ao_R[2]', 'P_Ao_R[3]'],
    ['Could not parse simulation file samples/default.2: missing']
  );

  assert.equal(inspections.find((entry) => entry.name === 'N')?.missingSimulationData, false);
  assert.equal(inspections.find((entry) => entry.name === 'Ghost')?.missingSimulationData, true);
  assert.ok(diagnostics.some((diagnostic) => diagnostic.message.includes('multiple position origins')));
  assert.ok(diagnostics.some((diagnostic) => diagnostic.message.includes('will not render')));
  assert.ok(diagnostics.some((diagnostic) => diagnostic.message.includes('Could not parse simulation file')));
});
