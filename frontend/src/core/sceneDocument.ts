import { inferObjectsFromChannels } from './inferObjects.ts';
import { DEFAULT_TEXT_MATERIAL } from './materialPresets.ts';
import { inferSceneReferenceContext } from './simulationChannels.ts';
import type {
  NormalizedSceneConfig,
  SceneConfig,
  SceneReferenceContext,
  SceneObject,
  SceneSpan,
  SceneSpanVisual,
  SceneVisual,
  SceneMaterial,
  Vector3Like,
} from './types.ts';

function vector(x = 0, y = 0, z = 0): Vector3Like {
  return { x, y, z };
}

export const DEFAULT_POINT_MARKER_WORKSPACE_FRACTION = 0.05;

function isValidObjectName(name: string): boolean {
  return name.trim().length > 0;
}

function cloneVisual(visual: SceneVisual): SceneVisual {
  return {
    ...visual,
    position: visual.position ? { ...visual.position } : undefined,
    rotation: visual.rotation ? { ...visual.rotation } : undefined,
    size: visual.size ? { ...visual.size } : undefined,
    material: cloneMaterial(visual.material),
  };
}

function cloneMaterial(material: SceneMaterial | undefined): SceneMaterial | undefined {
  if (typeof material === 'string' || material === undefined) {
    return material;
  }

  return { ...material };
}

function cloneSpanVisual(visual: SceneSpanVisual): SceneSpanVisual {
  return {
    ...visual,
    material: cloneMaterial(visual.material),
  };
}

function cloneSpan(span: SceneSpan): SceneSpan {
  const visualEntries = Object.entries(span.visual ?? {}).map(([name, visual]) => [
    name,
    cloneSpanVisual(visual),
  ]);

  return {
    ...span,
    visual: Object.fromEntries(visualEntries),
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

function createReferenceContext(scene: SceneConfig, channelNames: string[]): SceneReferenceContext {
  const priorReferenceContext = (scene as Partial<NormalizedSceneConfig>).referenceContext;
  return inferSceneReferenceContext(channelNames, {
    sceneOrigin: priorReferenceContext?.authoredSceneOrigin ?? scene.sceneOrigin,
    newtonianFrame: priorReferenceContext?.authoredNewtonianFrame ?? scene.newtonianFrame,
  });
}

function addEmptyDefaults(scene: SceneConfig, channelNames: string[]): NormalizedSceneConfig {
  const referenceContext = createReferenceContext(scene, channelNames);
  const inferredNewtonianFrame = referenceContext.newtonianFrame.canonical;
  const inferredSceneOrigin = referenceContext.sceneOrigin.canonical;
  const fallbackNewtonianFrame = referenceContext.authoredNewtonianFrame ?? 'N';
  const fallbackSceneOrigin = referenceContext.authoredSceneOrigin ?? `${fallbackNewtonianFrame}o`;
  const newtonianFrame = inferredNewtonianFrame ?? fallbackNewtonianFrame;
  const sceneOrigin = inferredSceneOrigin ?? fallbackSceneOrigin;
  const objects = Object.fromEntries(
    Object.entries(scene.objects ?? {})
      .filter(([name]) => isValidObjectName(name))
      .map(([name, sceneObject]) => [name, cloneObject(sceneObject)])
  );
  const spans = Object.fromEntries(
    Object.entries(scene.spans ?? {}).map(([name, span]) => [name, cloneSpan(span)])
  );

  if (newtonianFrame && !objects[newtonianFrame]) {
    objects[newtonianFrame] = { type: 'frame', visual: {} };
  }
  if (sceneOrigin && !objects[sceneOrigin]) {
    objects[sceneOrigin] = { type: 'point', visual: {} };
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
    sceneOrigin,
    backgroundColor: scene.backgroundColor ?? '#e0f0ff',
    showAxes: scene.showAxes ?? false,
    workspaceSize: scene.workspaceSize ?? 1.0,
    cameraParentFrame: scene.cameraParentFrame ?? newtonianFrame,
    referenceContext,
    objects,
    spans,
  };
}

function addDefaultBasesAndLabels(scene: NormalizedSceneConfig): NormalizedSceneConfig {
  const size = scene.workspaceSize / 4;
  const pointMarkerRadius = scene.workspaceSize * DEFAULT_POINT_MARKER_WORKSPACE_FRACTION;

  for (const [objectName, sceneObject] of Object.entries(scene.objects)) {
    sceneObject.visual ??= {};
    const hasAnyVisual = Object.keys(sceneObject.visual).length > 0;

    if (hasAnyVisual) {
      continue;
    }

    if (sceneObject.showLabel !== false && !sceneObject.visual.label) {
      sceneObject.visual.label = {
        visible: true,
        type: 'text',
        text: objectName,
        scale: size / 2,
        position: vector(size / 3, size / 8, 0),
        rotation: vector(0, 0, 0),
        material: { ...DEFAULT_TEXT_MATERIAL },
      };
    }

    if (sceneObject.type === 'frame' && sceneObject.showBasis !== false && !sceneObject.visual.basis) {
      sceneObject.visual.basis = {
        visible: true,
        type: 'basis',
        scale: size,
        position: vector(0, 0, 0),
        rotation: vector(0, 0, 0),
        material: { name: 'SILVER' },
      };
    }

    if (sceneObject.type === 'point' && !sceneObject.visual.point) {
      sceneObject.visual.point = {
        visible: true,
        type: 'sphere',
        radius: pointMarkerRadius,
        segments_width: 16,
        segments_height: 12,
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
  return normalizeSceneWithChannels(scene, []);
}

export function normalizeSceneWithChannels(
  scene: SceneConfig,
  channelNames: string[] = []
): NormalizedSceneConfig {
  return addDefaultPositionAndRotation(addDefaultBasesAndLabels(addEmptyDefaults(scene, channelNames)));
}

export function createSceneDocument(
  scene: SceneConfig,
  channelNames: string[] = []
): NormalizedSceneConfig {
  const normalized = normalizeSceneWithChannels(scene, channelNames);
  return addDefaultPositionAndRotation(
    addDefaultBasesAndLabels(inferObjectsFromChannels(normalized, channelNames))
  );
}
