import assert from 'node:assert/strict';
import test from 'node:test';

import { createSceneDocument } from './sceneDocument.ts';
import { evaluateScene } from './sceneEvaluation.ts';

test('scene evaluation resolves object positions and rotation-frame orientation from timeline data', () => {
  const scene = createSceneDocument({
    newtonianFrame: 'N',
    sceneOrigin: 'Ao',
    objects: {
      A: { type: 'frame', visual: {} },
      C1: { type: 'point', rotationFrame: 'C', visual: {} },
      C: { type: 'frame', visual: {} },
    },
  });

  const evaluation = evaluateScene(scene, {
    time: 0,
    data: {
      'P_Ao_Ao[1]': 1,
      'P_Ao_Ao[2]': 2,
      'P_Ao_Ao[3]': 3,
      'Ref_A[1,1]': 1,
      'Ref_A[1,2]': 0,
      'Ref_A[1,3]': 0,
      'Ref_A[2,1]': 0,
      'Ref_A[2,2]': 1,
      'Ref_A[2,3]': 0,
      'Ref_A[3,1]': 0,
      'Ref_A[3,2]': 0,
      'Ref_A[3,3]': 1,
      'P_Ao_C1[1]': 4,
      'P_Ao_C1[2]': 5,
      'P_Ao_C1[3]': 6,
      'Ref_C[1,1]': 0,
      'Ref_C[1,2]': -1,
      'Ref_C[1,3]': 0,
      'Ref_C[2,1]': 1,
      'Ref_C[2,2]': 0,
      'Ref_C[2,3]': 0,
      'Ref_C[3,1]': 0,
      'Ref_C[3,2]': 0,
      'Ref_C[3,3]': 1,
    },
  });

  assert.deepEqual(evaluation.objects.A.position, { x: 1, y: 2, z: 3 });
  assert.deepEqual(evaluation.objects.C1.position, { x: 4, y: 5, z: 6 });
  assert.deepEqual(evaluation.objects.C1.rotationMatrix, [0, -1, 0, 1, 0, 0, 0, 0, 1]);
});

test('scene evaluation applies cameraParentFrame to eye, focus, and up vectors', () => {
  const scene = createSceneDocument({
    newtonianFrame: 'N',
    cameraParentFrame: 'A',
    cameraEye: [2, 0, 0],
    cameraFocus: [0, 1, 0],
    cameraUp: [0, 0, 1],
    objects: {
      A: { type: 'frame', visual: {} },
    },
  });

  const evaluation = evaluateScene(scene, {
    time: 0,
    data: {
      'P_No_Ao[1]': 10,
      'P_No_Ao[2]': 20,
      'P_No_Ao[3]': 30,
      'World_A[1,1]': 0,
      'World_A[1,2]': -1,
      'World_A[1,3]': 0,
      'World_A[2,1]': 1,
      'World_A[2,2]': 0,
      'World_A[2,3]': 0,
      'World_A[3,1]': 0,
      'World_A[3,2]': 0,
      'World_A[3,3]': 1,
    },
  });

  assert.equal(evaluation.camera.parentFrame, 'A');
  assert.deepEqual(evaluation.camera.parentPosition, { x: 10, y: 20, z: 30 });
  assert.deepEqual(evaluation.camera.parentRotationMatrix, [0, -1, 0, 1, 0, 0, 0, 0, 1]);
  assert.deepEqual(evaluation.camera.worldEye, { x: 10, y: 22, z: 30 });
  assert.deepEqual(evaluation.camera.worldFocus, { x: 9, y: 20, z: 30 });
  assert.deepEqual(evaluation.camera.worldUp, { x: 0, y: 0, z: 1 });
});

test('scene evaluation falls back to identity camera parenting when the parent frame is unavailable', () => {
  const scene = createSceneDocument({
    newtonianFrame: 'N',
    cameraParentFrame: 'Missing',
    cameraEye: [1, 2, 3],
    cameraFocus: [4, 5, 6],
    cameraUp: [0, 1, 0],
    objects: {
      N: { type: 'frame', visual: {} },
    },
  });

  const evaluation = evaluateScene(scene, undefined);

  assert.deepEqual(evaluation.camera.worldEye, { x: 1, y: 2, z: 3 });
  assert.deepEqual(evaluation.camera.worldFocus, { x: 4, y: 5, z: 6 });
  assert.deepEqual(evaluation.camera.worldUp, { x: 0, y: 1, z: 0 });
});

test('scene evaluation normalizes cone, torus, and mesh visuals for rendering', () => {
  const scene = createSceneDocument({
    newtonianFrame: 'N',
    objects: {
      N: {
        type: 'frame',
        visual: {
          cone: {
            type: 'cone',
            radius1: 0.2,
            radius2: 0.4,
            length: 1.5,
            segments_radius: 18,
            segments_height: 2,
            capped: false,
          },
          torus: {
            type: 'torus',
            radius: 0.3,
            thickness: 0.1,
            segments_radius: 24,
            segments_thickness: 10,
            arc: Math.PI,
          },
          grid: {
            type: 'grid',
            cell_size: 0.5,
            count_x: 8,
            count_y: 4,
          },
          mesh: {
            type: 'mesh',
            path: 'LinkA.obj',
            scale: 0.25,
          },
        },
      },
    },
  });

  const evaluation = evaluateScene(scene, {
    time: 0,
    data: {
      'P_No_N[1]': 0,
      'P_No_N[2]': 0,
      'P_No_N[3]': 0,
      'World_N[1,1]': 1,
      'World_N[1,2]': 0,
      'World_N[1,3]': 0,
      'World_N[2,1]': 0,
      'World_N[2,2]': 1,
      'World_N[2,3]': 0,
      'World_N[3,1]': 0,
      'World_N[3,2]': 0,
      'World_N[3,3]': 1,
    },
  });
  const visuals = evaluation.objects.N.visuals;

  assert.deepEqual(visuals.find((visual) => visual.name === 'cone'), {
    name: 'cone',
    type: 'cone',
    visible: true,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    material: { name: 'SILVER', color: undefined },
    radiusTop: 0.2,
    radiusBottom: 0.4,
    length: 1.5,
    segmentsRadius: 18,
    segmentsHeight: 2,
    capped: false,
  });

  assert.deepEqual(visuals.find((visual) => visual.name === 'torus'), {
    name: 'torus',
    type: 'torus',
    visible: true,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    material: { name: 'SILVER', color: undefined },
    radius: 0.3,
    thickness: 0.1,
    segmentsRadius: 24,
    segmentsThickness: 10,
    arc: Math.PI,
  });

  assert.deepEqual(visuals.find((visual) => visual.name === 'grid'), {
    name: 'grid',
    type: 'grid',
    visible: true,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    material: { name: 'SILVER', color: undefined },
    cellSize: 0.5,
    countX: 8,
    countY: 4,
  });

  assert.deepEqual(visuals.find((visual) => visual.name === 'mesh'), {
    name: 'mesh',
    type: 'mesh',
    visible: true,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    material: { name: 'SILVER', color: undefined },
    path: 'LinkA.obj',
    scale: 0.25,
  });
});

test('scene evaluation normalizes text visuals for rendering', () => {
  const scene = createSceneDocument({
    newtonianFrame: 'N',
    objects: {
      N: {
        type: 'frame',
        visual: {
          label: {
            type: 'text',
            text: 'N',
            scale: 0.5,
          },
        },
      },
    },
  });

  const evaluation = evaluateScene(scene, {
    time: 0,
    data: {
      'P_No_N[1]': 0,
      'P_No_N[2]': 0,
      'P_No_N[3]': 0,
    },
  });

  assert.deepEqual(evaluation.objects.N.visuals.find((visual) => visual.name === 'label'), {
    name: 'label',
    type: 'text',
    visible: true,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    material: { name: 'SILVER', color: undefined },
    text: 'N',
    scale: 0.5,
  });
});

test('scene evaluation skips visuals for objects with no backing simulation data', () => {
  const scene = createSceneDocument({
    newtonianFrame: 'N',
    objects: {
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
  });

  const evaluation = evaluateScene(scene, {
    time: 0,
    data: {
      'P_No_N[1]': 0,
      'P_No_N[2]': 0,
      'P_No_N[3]': 0,
    },
  });

  assert.deepEqual(evaluation.objects.Ghost.visuals, []);
});

test('scene evaluation keeps the newtonian frame renderable without explicit sim channels', () => {
  const scene = createSceneDocument({
    newtonianFrame: 'N',
    objects: {
      N: {
        type: 'frame',
        visual: {
          marker: {
            type: 'sphere',
            radius: 0.25,
          },
        },
      },
    },
  });

  const evaluation = evaluateScene(scene, {
    time: 0,
    data: {},
  });

  assert.equal(evaluation.objects.N.visuals.length, 1);
  assert.equal(evaluation.objects.N.visuals[0]?.name, 'marker');
});

test('scene evaluation resolves cable spans from sceneOrigin point data', () => {
  const scene = createSceneDocument({
    newtonianFrame: 'N',
    sceneOrigin: 'No',
    spans: {
      cable1: {
        type: 'cable',
        point1: 'N1',
        point2: 'C1',
        visual: {
          wire1: {
            thickness: 2,
            material: 'BLACK',
          },
        },
      },
    },
  });

  const evaluation = evaluateScene(scene, {
    time: 0,
    data: {
      'P_No_N1[1]': 1,
      'P_No_N1[2]': 2,
      'P_No_N1[3]': 3,
      'P_No_C1[1]': 4,
      'P_No_C1[2]': 5,
      'P_No_C1[3]': 6,
    },
  });

  assert.deepEqual(evaluation.spans, [
    {
      name: 'cable1.wire1',
      kind: 'line',
      visible: true,
      material: { name: 'BLACK', color: undefined },
      width: 2,
      lineStyle: 'solid',
      start: { x: 1, y: 2, z: 3 },
      end: { x: 4, y: 5, z: 6 },
    },
  ]);
});
