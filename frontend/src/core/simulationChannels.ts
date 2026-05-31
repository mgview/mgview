import type {
  NormalizedSceneConfig,
  SceneObject,
  SceneReferenceContext,
  SceneReferenceInference,
} from './types.ts';

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

export function hasSimulationPositionDataFromOrigin(
  channelNames: string[],
  originName: string,
  objectName: string
): boolean {
  const candidates = new Set(objectPositionCandidates(objectName));
  return channelNames.some((channelName) => {
    const match = channelName.match(POSITION_CHANNEL);
    return match ? match[1] === originName && candidates.has(match[2]) : false;
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

  return [...origins];
}

export function collectBaseFrames(channelNames: string[]): string[] {
  const baseFrames = new Set<string>();

  for (const channelName of channelNames) {
    const match = channelName.match(MATRIX_CHANNEL);
    if (match) {
      baseFrames.add(match[1]);
    }
  }

  return [...baseFrames];
}

export function inferCanonicalSceneOrigin(channelNames: string[]): SceneReferenceInference {
  const all = collectPositionOrigins(channelNames);
  return {
    canonical: all[0] ?? null,
    all,
  };
}

export function inferCanonicalNewtonianFrame(channelNames: string[]): SceneReferenceInference {
  const all = collectBaseFrames(channelNames);
  return {
    canonical: all[0] ?? null,
    all,
  };
}

export function inferSceneReferenceContext(
  channelNames: string[],
  authoredValues?: {
    sceneOrigin?: string | null;
    newtonianFrame?: string | null;
  }
): SceneReferenceContext {
  return {
    sceneOrigin: inferCanonicalSceneOrigin(channelNames),
    newtonianFrame: inferCanonicalNewtonianFrame(channelNames),
    authoredSceneOrigin: authoredValues?.sceneOrigin?.trim() || null,
    authoredNewtonianFrame: authoredValues?.newtonianFrame?.trim() || null,
  };
}

export function hasRenderableSimulationAnchor(
  scene: NormalizedSceneConfig,
  objectName: string,
  sceneObject: SceneObject,
  channelNames: string[]
): boolean {
  if (objectName === scene.newtonianFrame || objectName === scene.sceneOrigin) {
    return true;
  }

  return (
    hasSimulationPositionDataFromOrigin(channelNames, scene.sceneOrigin, objectName) ||
    hasSimulationRotationData(channelNames, sceneObject.rotationFrame ?? objectName)
  );
}
