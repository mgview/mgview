import type { NormalizedSceneConfig, SceneObject } from './types.ts';

const POSITION_CHANNEL = /^P_([^_]+)_([^\[]+)\[([123])\]$/;
const MATRIX_CHANNEL = /^([^_]+)_([^\[]+)\[([123]),([123])\]$/;

function objectPositionCandidates(objectName: string): string[] {
  return [objectName, `${objectName}o`, `${objectName}cm`];
}

export function hasSimulationPositionData(channelNames: string[], objectName: string): boolean {
  const candidates = new Set(objectPositionCandidates(objectName));
  return channelNames.some((channelName) => {
    const match = channelName.match(POSITION_CHANNEL);
    return match ? candidates.has(match[2]) : false;
  });
}

export function hasSimulationRotationData(channelNames: string[], frameName: string): boolean {
  return channelNames.some((channelName) => {
    const match = channelName.match(MATRIX_CHANNEL);
    return match ? match[2] === frameName : false;
  });
}

export function collectPositionOrigins(channelNames: string[]): string[] {
  const origins = new Set<string>();

  for (const channelName of channelNames) {
    const match = channelName.match(POSITION_CHANNEL);
    if (match) {
      origins.add(match[1]);
    }
  }

  return [...origins].sort((left, right) => left.localeCompare(right));
}

export function hasRenderableSimulationAnchor(
  scene: NormalizedSceneConfig,
  objectName: string,
  sceneObject: SceneObject,
  channelNames: string[]
): boolean {
  if (objectName === scene.newtonianFrame) {
    return true;
  }

  return (
    hasSimulationPositionData(channelNames, objectName) ||
    hasSimulationRotationData(channelNames, sceneObject.rotationFrame ?? objectName)
  );
}
