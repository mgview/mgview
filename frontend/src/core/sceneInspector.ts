import type {
  NormalizedSceneConfig,
  SceneConfig,
  SceneDiagnostic,
  SceneObjectInspection,
  SceneObjectVisualInspection,
  SceneVisual,
  Vector3Like,
} from './types.ts';

function hasOwn<K extends PropertyKey>(value: object, key: K): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function makeVisualTags(
  rawVisual: Record<string, unknown> | undefined,
  visualName: string
): string[] {
  const tags: string[] = [];

  if (visualName === 'label' && !rawVisual) {
    tags.push('default label');
  }
  if (visualName === 'basis' && !rawVisual) {
    tags.push('default basis');
  }
  if (rawVisual && !hasOwn(rawVisual, 'position')) {
    tags.push('default position');
  }
  if (rawVisual && !hasOwn(rawVisual, 'rotation')) {
    tags.push('default rotation');
  }
  if (rawVisual && !hasOwn(rawVisual, 'visible')) {
    tags.push('default visible');
  }

  return tags;
}

function isVector3Like(value: unknown): value is Vector3Like {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { x?: unknown }).x === 'number' &&
    typeof (value as { y?: unknown }).y === 'number' &&
    typeof (value as { z?: unknown }).z === 'number'
  );
}

function formatNumber(value: number): string {
  if (Math.abs(value) >= 1000 || (Math.abs(value) > 0 && Math.abs(value) < 0.001)) {
    return value.toExponential(3);
  }

  return value.toFixed(4).replace(/\.?0+$/, '');
}

function formatVector3(value: Vector3Like): string {
  return `${formatNumber(value.x)}, ${formatNumber(value.y)}, ${formatNumber(value.z)}`;
}

function summarizeVisualProperties(visual: SceneVisual): Array<{ key: string; value: string }> {
  const propertyOrder = [
    'text',
    'path',
    'scale',
    'size',
    'radius',
    'radius1',
    'radius2',
    'length',
    'thickness',
    'capped',
    'segments_width',
    'segments_height',
    'segments_depth',
    'segments_radius',
    'segments_thickness',
  ] as const;

  const summary: Array<{ key: string; value: string }> = [];

  for (const key of propertyOrder) {
    const value = visual[key];
    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value === 'string') {
      if (value.length === 0) {
        continue;
      }
      summary.push({ key, value });
      continue;
    }

    if (typeof value === 'number') {
      summary.push({ key, value: formatNumber(value) });
      continue;
    }

    if (typeof value === 'boolean') {
      summary.push({ key, value: String(value) });
      continue;
    }

    if (isVector3Like(value)) {
      summary.push({ key, value: formatVector3(value) });
    }
  }

  return summary;
}

export function buildObjectInspections(
  rawScene: SceneConfig,
  scene: NormalizedSceneConfig
): SceneObjectInspection[] {
  const rawObjects = rawScene.objects ?? {};

  return Object.entries(scene.objects)
    .map(([objectName, sceneObject]) => {
      const rawObject = rawObjects[objectName];
      const rawVisuals = rawObject?.visual ?? {};

      const visuals: SceneObjectVisualInspection[] = Object.entries(sceneObject.visual ?? {})
        .map(([visualName, visual]) => {
          const rawVisual = rawVisuals[visualName] as Record<string, unknown> | undefined;

          return {
            name: visualName,
            type: visual.type,
            visible: visual.visible ?? true,
            materialName: visual.material?.name ?? null,
            position: visual.position ?? null,
            rotation: visual.rotation ?? null,
            propertySummary: summarizeVisualProperties(visual),
            tags: makeVisualTags(rawVisual, visualName),
          };
        })
        .sort((left, right) => left.name.localeCompare(right.name));

      const tags: string[] = [];
      if (!rawObject) {
        tags.push('inferred from channels');
      }
      if (sceneObject.type === 'frame' && rawObject && rawObject.type !== 'frame') {
        tags.push('promoted to frame');
      }

      return {
        name: objectName,
        type: sceneObject.type,
        rotationFrame: sceneObject.rotationFrame,
        inferred: !rawObject,
        visualCount: visuals.length,
        visuals,
        tags,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function collectSceneDiagnostics(
  rawScene: SceneConfig,
  scene: NormalizedSceneConfig,
  simulationFiles: string[],
  channelNames: string[]
): SceneDiagnostic[] {
  const diagnostics: SceneDiagnostic[] = [];
  const rawObjects = rawScene.objects ?? {};

  if ((rawScene.simulationData ?? []).length === 0) {
    diagnostics.push({
      severity: 'warning',
      message: 'Scene JSON does not list any simulationData entries.',
    });
  }

  if (simulationFiles.length === 0) {
    diagnostics.push({
      severity: 'warning',
      message: 'No simulation files were expanded from the scene configuration.',
    });
  }

  const inferredObjects = Object.keys(scene.objects).filter((objectName) => !rawObjects[objectName]);
  if (inferredObjects.length > 0) {
    diagnostics.push({
      severity: 'info',
      message: `Inferred ${inferredObjects.length} object(s) from simulation channels: ${inferredObjects.join(', ')}`,
    });
  }

  const autoVisuals: string[] = [];
  for (const [objectName, sceneObject] of Object.entries(scene.objects)) {
    const rawVisuals = rawObjects[objectName]?.visual ?? {};
    for (const visualName of Object.keys(sceneObject.visual ?? {})) {
      if (!rawVisuals[visualName] && (visualName === 'label' || visualName === 'basis')) {
        autoVisuals.push(`${objectName}.${visualName}`);
      }
    }
  }
  if (autoVisuals.length > 0) {
    diagnostics.push({
      severity: 'info',
      message: `Added ${autoVisuals.length} default label/basis visual(s).`,
    });
  }

  if (channelNames.length === 0) {
    diagnostics.push({
      severity: 'warning',
      message: 'No simulation channels were parsed from the selected files.',
    });
  }

  return diagnostics;
}
