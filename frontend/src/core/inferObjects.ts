import type { NormalizedSceneConfig } from './types.ts';

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

  for (const channelName of channelNames) {
    const positionMatch = channelName.match(POSITION_CHANNEL);
    if (positionMatch) {
      const frameName = positionMatch[2];
      if (!(frameName in nextScene.objects)) {
        nextScene.objects[frameName] = { type: 'point', visual: {} };
      }
      continue;
    }

    const matrixMatch = channelName.match(MATRIX_CHANNEL);
    if (!matrixMatch) {
      continue;
    }

    const frameName = matrixMatch[2];
    const existing = nextScene.objects[frameName];

    if (!existing) {
      nextScene.objects[frameName] = { type: 'frame', visual: {} };
      continue;
    }

    if (existing.type !== 'frame') {
      nextScene.objects[frameName] = {
        ...existing,
        type: 'frame',
      };
    }
  }

  return nextScene;
}
