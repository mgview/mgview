import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { createSceneDocument, DEFAULT_POINT_MARKER_WORKSPACE_FRACTION } from './sceneDocument.ts';
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
  const scene = {
    ...(await readSceneFixture('default.json')),
    objects: {
      N: { type: 'frame', visual: {} },
      P: { type: 'point', visual: {} },
    },
  };
  const document = createSceneDocument(scene);

  assert.equal(document.newtonianFrame, 'N');
  assert.equal(document.sceneOrigin, 'No');
  assert.equal(document.referenceContext.newtonianFrame.canonical, null);
  assert.equal(document.referenceContext.sceneOrigin.canonical, null);
  assert.equal(document.backgroundColor, '#e0f0ff');
  assert.equal(document.cameraParentFrame, 'N');
  assert.ok(document.objects.N);
  assert.equal(document.objects.N.type, 'frame');
  assert.ok(document.objects.N.visual?.label);
  assert.ok(document.objects.N.visual?.basis);
  assert.equal(document.objects.P.type, 'point');
  assert.ok(document.objects.P.visual?.label);
  assert.ok(document.objects.P.visual?.point);
  assert.equal(document.objects.P.visual?.basis, undefined);
  assert.equal(
    document.objects.P.visual?.point?.radius,
    document.workspaceSize * DEFAULT_POINT_MARKER_WORKSPACE_FRACTION
  );
});

test('scene normalization does not auto-add defaults when authored visuals already exist', () => {
  const document = createSceneDocument({
    newtonianFrame: 'N',
    sceneOrigin: 'No',
    workspaceSize: 2,
    objects: {
      N: {
        type: 'frame',
        showBasis: false,
        showLabel: false,
        visual: {
          body: {
            type: 'box',
            size: { x: 1, y: 1, z: 1 },
          },
        },
      },
      P: {
        type: 'point',
        showLabel: true,
        visual: {
          dot: {
            type: 'sphere',
            radius: 0.05,
          },
        },
      },
    },
  });

  assert.deepEqual(Object.keys(document.objects.N.visual ?? {}), ['body']);
  assert.deepEqual(Object.keys(document.objects.P.visual ?? {}), ['dot']);
});

test('scene normalization drops authored objects with blank names', () => {
  const document = createSceneDocument({
    newtonianFrame: 'N',
    sceneOrigin: 'No',
    objects: {
      N: { type: 'frame', visual: {} },
      '': { type: 'frame', visual: {} },
      '   ': { type: 'point', visual: {} },
    },
  });

  assert.equal(document.objects.N.type, 'frame');
  assert.equal(document.objects[''], undefined);
  assert.equal(document.objects['   '], undefined);
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
  assert.equal(document.objects.No.type, 'point');
  assert.equal(document.newtonianFrame, 'N');
  assert.equal(document.sceneOrigin, 'No');
  assert.deepEqual(document.referenceContext.newtonianFrame.all, ['N']);
  assert.deepEqual(document.referenceContext.sceneOrigin.all, ['No']);
});

test('inferred reference context overrides authored legacy values for normalization', () => {
  const document = createSceneDocument(
    {
      newtonianFrame: 'Legacy',
      sceneOrigin: 'LegacyOrigin',
      objects: {},
    },
    ['P_No_Ao[1]', 'P_No_Ao[2]', 'P_No_Ao[3]', 'N_A[1,1]']
  );

  assert.equal(document.newtonianFrame, 'N');
  assert.equal(document.sceneOrigin, 'No');
  assert.equal(document.referenceContext.authoredNewtonianFrame, 'Legacy');
  assert.equal(document.referenceContext.authoredSceneOrigin, 'LegacyOrigin');
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
  const qMarker = qObject?.visuals.find((visual) => visual.name === 'point');
  const nLabel = nObject?.visuals.find((visual) => visual.name === 'label');

  assert.ok(qObject);
  assert.equal(qObject.inferred, true);
  assert.equal(qObject.missingSimulationData, false);
  assert.ok(qMarker?.tags.includes('default point marker'));
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
    [
      {
        filePath: 'samples/default.1',
        channelNames: ['P_No_Q[1]'],
        sceneOrigin: { canonical: 'No', all: ['No'] },
        newtonianFrame: { canonical: null, all: [] },
      },
      {
        filePath: 'samples/default.2',
        channelNames: ['P_Ao_R[1]', 'P_Ao_R[2]', 'P_Ao_R[3]'],
        sceneOrigin: { canonical: 'Ao', all: ['Ao'] },
        newtonianFrame: { canonical: null, all: [] },
      },
    ],
    ['Could not parse simulation file samples/default.2: missing']
  );

  assert.equal(inspections.find((entry) => entry.name === 'N')?.missingSimulationData, false);
  assert.equal(inspections.find((entry) => entry.name === 'Ghost')?.missingSimulationData, true);
  assert.ok(diagnostics.some((diagnostic) => diagnostic.message.includes('multiple position origins')));
  assert.ok(diagnostics.some((diagnostic) => diagnostic.message.includes('not used')));
  assert.ok(diagnostics.some((diagnostic) => diagnostic.message.includes('will not render')));
  assert.ok(diagnostics.some((diagnostic) => diagnostic.message.includes('Could not parse simulation file')));
});
