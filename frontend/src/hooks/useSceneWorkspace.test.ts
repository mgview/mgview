import assert from 'node:assert/strict';
import test from 'node:test';

import { createSceneDocument } from '../core/sceneDocument.ts';
import { createNewSceneTemplate, createSavableScene } from './useSceneWorkspace.ts';

test('createSavableScene preserves inferred objects added through the draft scene', () => {
  const rawScene = {
    newtonianFrame: 'N',
    simulationData: ['demo.1'],
    objects: {
      N: { type: 'frame', visual: {} },
    },
  };

  const draftScene = createSceneDocument(rawScene, ['P_No_Qo[1]', 'P_No_Qo[2]', 'P_No_Qo[3]']);
  draftScene.objects.Qo.visual ??= {};
  draftScene.objects.Qo.visual.marker = {
    type: 'sphere',
    radius: 0.5,
    material: { name: 'RED' },
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    visible: true,
  };

  const savableScene = createSavableScene(rawScene, draftScene);

  assert.equal(savableScene.objects?.Qo?.type, 'point');
  assert.deepEqual(savableScene.objects?.Qo?.visual?.marker, draftScene.objects.Qo.visual.marker);
});

test('createNewSceneTemplate derives a scene name and starts without simulation files', () => {
  const template = createNewSceneTemplate('projects/demo/my_scene.json');

  assert.equal(template.name, 'my_scene');
  assert.deepEqual(template.simulationData, []);
  assert.equal(template.newtonianFrame, 'N');
  assert.equal(template.sceneOrigin, 'No');
  assert.deepEqual(template.cameraUp, [0, 0, 1]);
});
