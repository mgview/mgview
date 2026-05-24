import { inferObjectsFromChannels } from './inferObjects.ts';
import type {
  NormalizedSceneConfig,
  SceneConfig,
  SceneObject,
  SceneVisual,
  Vector3Like,
} from './types.ts';

function vector(x = 0, y = 0, z = 0): Vector3Like {
  return { x, y, z };
}

function cloneVisual(visual: SceneVisual): SceneVisual {
  return {
    ...visual,
    position: visual.position ? { ...visual.position } : undefined,
    rotation: visual.rotation ? { ...visual.rotation } : undefined,
    size: visual.size ? { ...visual.size } : undefined,
    material: visual.material ? { ...visual.material } : undefined,
  };
}

function cloneObject(sceneObject: SceneObject): SceneObject {
  const visualEntries = Object.entries(sceneObject.visual ?? {}).map(([name, visual]) => [
    name,
    cloneVisual(visual),
  ]);

  return {
    ...sceneObject,
    visual: Object.fromEntries(visualEntries),
  };
}

function addEmptyDefaults(scene: SceneConfig): NormalizedSceneConfig {
  const newtonianFrame = scene.newtonianFrame ?? 'N';
  const objects = Object.fromEntries(
    Object.entries(scene.objects ?? {}).map(([name, sceneObject]) => [name, cloneObject(sceneObject)])
  );

  if (!objects[newtonianFrame]) {
    objects[newtonianFrame] = { type: 'frame', visual: {} };
  }

  for (const sceneObject of Object.values(objects)) {
    sceneObject.visual ??= {};
    for (const visual of Object.values(sceneObject.visual)) {
      visual.visible ??= true;
    }
  }

  return {
    ...scene,
    simulationData: [...(scene.simulationData ?? [])],
    newtonianFrame,
    sceneOrigin: scene.sceneOrigin ?? `${newtonianFrame}o`,
    showAxes: scene.showAxes ?? false,
    workspaceSize: scene.workspaceSize ?? 1.0,
    cameraParentFrame: scene.cameraParentFrame ?? newtonianFrame,
    objects,
  };
}

function addDefaultBasesAndLabels(scene: NormalizedSceneConfig): NormalizedSceneConfig {
  const size = scene.workspaceSize / 4;

  for (const [objectName, sceneObject] of Object.entries(scene.objects)) {
    sceneObject.visual ??= {};

    if (!sceneObject.visual.label) {
      sceneObject.visual.label = {
        visible: true,
        type: 'text',
        text: objectName,
        scale: size / 2,
        position: vector(size / 3, size / 8, 0),
        rotation: vector(0, 0, 0),
        material: { name: 'SILVER' },
      };
    }

    if (!sceneObject.visual.basis) {
      sceneObject.visual.basis = {
        visible: true,
        type: 'basis',
        scale: size,
        position: vector(0, 0, 0),
        rotation: vector(0, 0, 0),
        material: { name: 'SILVER' },
      };
    }
  }

  return scene;
}

function addDefaultPositionAndRotation(scene: NormalizedSceneConfig): NormalizedSceneConfig {
  for (const sceneObject of Object.values(scene.objects)) {
    for (const visual of Object.values(sceneObject.visual ?? {})) {
      visual.position ??= vector(0, 0, 0);
      visual.rotation ??= vector(0, 0, 0);
    }
  }

  return scene;
}

export function normalizeScene(scene: SceneConfig): NormalizedSceneConfig {
  return addDefaultPositionAndRotation(addDefaultBasesAndLabels(addEmptyDefaults(scene)));
}

export function createSceneDocument(
  scene: SceneConfig,
  channelNames: string[] = []
): NormalizedSceneConfig {
  const normalized = normalizeScene(scene);
  return inferObjectsFromChannels(normalized, channelNames);
}
