import type { NormalizedSceneConfig } from './types.ts';
import { hasSimulationPositionData, hasSimulationRotationData } from './simulationChannels.ts';

const POSITION_CHANNEL = /^P_([^_]+)_([^\[]+)\[([123])\]$/;
const MATRIX_CHANNEL = /^([^_]+)_([^\[]+)\[([123]),([123])\]$/;

export function inferObjectsFromChannels(
  scene: NormalizedSceneConfig,
  channelNames: string[]
): NormalizedSceneConfig {
  const nextScene: NormalizedSceneConfig = {
    ...scene,
    objects: { ...scene.objects },
  };

  for (const objectName of new Set(
    channelNames.flatMap((channelName) => {
      const matrixMatch = channelName.match(MATRIX_CHANNEL);
      const positionMatch = channelName.match(POSITION_CHANNEL);
      return [matrixMatch?.[2], positionMatch?.[2]].filter((value): value is string => Boolean(value));
    })
  )) {
    if (!nextScene.objects[objectName] && hasSimulationPositionData(channelNames, objectName)) {
      nextScene.objects[objectName] = { type: 'point', visual: {} };
    }

    if (!hasSimulationRotationData(channelNames, objectName)) {
      continue;
    }

    const existing = nextScene.objects[objectName];
    if (!existing) {
      nextScene.objects[objectName] = { type: 'frame', visual: {} };
      continue;
    }

    if (existing.type !== 'frame') {
      nextScene.objects[objectName] = {
        ...existing,
        type: 'frame',
      };
    }
  }

  return nextScene;
}
