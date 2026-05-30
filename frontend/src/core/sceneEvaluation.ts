import type {
  NormalizedSceneConfig,
  RenderSpan,
  RenderVisual,
  SceneMaterial,
  SceneSpan,
  SceneSpanVisual,
  SceneVisual,
  TimelineFrame,
  Vector3Like,
} from './types.ts';
import { hasRenderableSimulationAnchor } from './simulationChannels.ts';

export interface SceneObjectSnapshot {
  name: string;
  position: Vector3Like;
  rotationMatrix: number[] | null;
  visuals: RenderVisual[];
}

export interface SceneCameraSnapshot {
  parentFrame: string;
  parentPosition: Vector3Like;
  parentRotationMatrix: number[] | null;
  localEye: Vector3Like;
  localFocus: Vector3Like;
  localUp: Vector3Like;
  worldEye: Vector3Like;
  worldFocus: Vector3Like;
  worldUp: Vector3Like;
}

export interface SceneEvaluation {
  objects: Record<string, SceneObjectSnapshot>;
  camera: SceneCameraSnapshot;
  spans: RenderSpan[];
}

function vector(x = 0, y = 0, z = 0): Vector3Like {
  return { x, y, z };
}

function material(name = 'SILVER', color?: { r: number; g: number; b: number; a?: number }) {
  return {
    name,
    color,
  };
}

function normalizeMaterialDefinition(input: SceneMaterial | undefined) {
  if (typeof input === 'string') {
    return material(input);
  }

  return material(input?.name ?? 'SILVER', input?.color);
}

function fromTuple(value: [number, number, number] | undefined, fallback: Vector3Like): Vector3Like {
  return vector(value?.[0] ?? fallback.x, value?.[1] ?? fallback.y, value?.[2] ?? fallback.z);
}

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readByPattern(
  values: Record<string, number>,
  pattern: RegExp
): number | undefined {
  for (const [channelName, value] of Object.entries(values)) {
    if (pattern.test(channelName)) {
      return value;
    }
  }

  return undefined;
}

function add(left: Vector3Like, right: Vector3Like): Vector3Like {
  return vector(left.x + right.x, left.y + right.y, left.z + right.z);
}

function multiplyMatrixVector(matrix: number[] | null, value: Vector3Like): Vector3Like {
  if (!matrix) {
    return { ...value };
  }

  return vector(
    matrix[0] * value.x + matrix[1] * value.y + matrix[2] * value.z,
    matrix[3] * value.x + matrix[4] * value.y + matrix[5] * value.z,
    matrix[6] * value.x + matrix[7] * value.y + matrix[8] * value.z
  );
}

function readPosition(
  values: Record<string, number>,
  objectName: string
): Vector3Like | null {
  const candidates = [objectName, `${objectName}o`, `${objectName}cm`].map(escapeForRegex);
  const x = candidates
    .map((candidate) => readByPattern(values, new RegExp(`^P_[^_]+_${candidate}\\[1\\]$`)))
    .find((value) => typeof value === 'number');
  const y = candidates
    .map((candidate) => readByPattern(values, new RegExp(`^P_[^_]+_${candidate}\\[2\\]$`)))
    .find((value) => typeof value === 'number');
  const z = candidates
    .map((candidate) => readByPattern(values, new RegExp(`^P_[^_]+_${candidate}\\[3\\]$`)))
    .find((value) => typeof value === 'number');

  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
    return null;
  }

  return vector(x, y, z);
}

function readRotationMatrix(
  values: Record<string, number>,
  frameName: string
): number[] | null {
  const escapedFrameName = escapeForRegex(frameName);
  const readEntry = (row: 1 | 2 | 3, column: 1 | 2 | 3) =>
    readByPattern(values, new RegExp(`^(?!P_)[^_]+_${escapedFrameName}\\[${row},${column}\\]$`));
  const matrix = [
    readEntry(1, 1),
    readEntry(1, 2),
    readEntry(1, 3),
    readEntry(2, 1),
    readEntry(2, 2),
    readEntry(2, 3),
    readEntry(3, 1),
    readEntry(3, 2),
    readEntry(3, 3),
  ];

  if (matrix.some((value) => typeof value !== 'number')) {
    return null;
  }

  return matrix as number[];
}

function normalizeRenderVisual(visualName: string, visual: SceneVisual): RenderVisual | null {
  const base = {
    name: visualName,
    type: visual.type,
    visible: visual.visible !== false,
    position: visual.position ? { ...visual.position } : vector(0, 0, 0),
    rotation: visual.rotation ? { ...visual.rotation } : vector(0, 0, 0),
    material: normalizeMaterialDefinition(visual.material),
  };

  switch (visual.type) {
    case 'sphere':
      return {
        ...base,
        type: 'sphere',
        radius: visual.radius ?? 1,
        segmentsWidth: visual.segments_width ?? 16,
        segmentsHeight: visual.segments_height ?? 12,
      };
    case 'box':
      return {
        ...base,
        type: 'box',
        size: visual.size ? { ...visual.size } : vector(1, 1, 1),
        segmentsWidth: visual.segments_width ?? 1,
        segmentsHeight: visual.segments_height ?? 1,
        segmentsDepth: visual.segments_depth ?? 1,
      };
    case 'cylinder':
      return {
        ...base,
        type: 'cylinder',
        radius: visual.radius ?? 1,
        length: visual.length ?? 1,
        segmentsRadius: visual.segments_radius ?? 16,
        segmentsHeight: visual.segments_height ?? 1,
        capped: visual.capped !== false,
      };
    case 'cone':
      return {
        ...base,
        type: 'cone',
        radiusTop: visual.radius1 ?? 1,
        radiusBottom: visual.radius2 ?? 1,
        length: visual.length ?? 1,
        segmentsRadius: visual.segments_radius ?? 12,
        segmentsHeight: visual.segments_height ?? 1,
        capped: visual.capped !== false,
      };
    case 'torus':
      return {
        ...base,
        type: 'torus',
        radius: visual.radius ?? 1,
        thickness: visual.thickness ?? 0.3,
        segmentsRadius: visual.segments_radius ?? 12,
        segmentsThickness: visual.segments_thickness ?? 8,
        arc: typeof visual.arc === 'number' ? visual.arc : undefined,
      };
    case 'grid':
      return {
        ...base,
        type: 'grid',
        cellSize: visual.cell_size ?? 0.5,
        countX: visual.count_x ?? 6,
        countY: visual.count_y ?? 6,
      };
    case 'mesh':
      if (typeof visual.path !== 'string' || visual.path.trim() === '') {
        return null;
      }

      return {
        ...base,
        type: 'mesh',
        path: visual.path,
        scale: visual.scale ?? 1,
      };
    case 'text':
      return {
        ...base,
        type: 'text',
        text: typeof visual.text === 'string' ? visual.text : '',
        scale: visual.scale ?? 1,
      };
    case 'basis':
      return {
        ...base,
        type: 'basis',
        scale: visual.scale ?? 1,
      };
    default:
      return null;
  }
}

function readPointPosition(
  values: Record<string, number>,
  sceneOrigin: string,
  pointName: string
): Vector3Like | null {
  // MotionGenesis never exports P_<origin>_<origin>; the scene origin is always (0,0,0).
  if (pointName === sceneOrigin) {
    return vector(0, 0, 0);
  }

  const escapedPointName = escapeForRegex(pointName);
  const x = readByPattern(values, new RegExp(`^P_${escapeForRegex(sceneOrigin)}_${escapedPointName}\\[1\\]$`));
  const y = readByPattern(values, new RegExp(`^P_${escapeForRegex(sceneOrigin)}_${escapedPointName}\\[2\\]$`));
  const z = readByPattern(values, new RegExp(`^P_${escapeForRegex(sceneOrigin)}_${escapedPointName}\\[3\\]$`));

  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
    return null;
  }

  return vector(x, y, z);
}

function normalizeSpanVisual(
  spanName: string,
  span: SceneSpan,
  visualName: string,
  visual: SceneSpanVisual,
  sceneOrigin: string,
  values: Record<string, number>
): RenderSpan | null {
  const kind = visual.kind ?? 'line';

  const start = readPointPosition(values, sceneOrigin, span.point1);
  const end = readPointPosition(values, sceneOrigin, span.point2);
  if (!start || !end) {
    return null;
  }

  const base = {
    name: `${spanName}.${visualName}`,
    visible: visual.visible !== false,
    start,
    end,
  } as const;
  const legacyWidth = visual.width ?? visual.thickness ?? 1;

  switch (kind) {
    case 'cylinder':
      return {
        ...base,
        kind: 'cylinder',
        material: normalizeMaterialDefinition(visual.material),
        width: legacyWidth,
        segmentsLength: 2,
        segmentsRadius: 8,
      };
    case 'spring':
      return {
        ...base,
        kind: 'spring',
        material: normalizeMaterialDefinition(visual.material),
        stretchMaterial: normalizeMaterialDefinition(visual.stretchMaterial ?? '#74c0fc'),
        naturalLength: visual.naturalLength ?? 1,
        coilWidth: visual.coilWidth ?? 0.12,
        stretchWidth: visual.stretchWidth ?? 0.06,
        segmentsRadius: 12,
      };
    case 'line':
    default:
      return {
        ...base,
        kind: 'line',
        material: normalizeMaterialDefinition(visual.material),
        width: legacyWidth,
        lineStyle: visual.lineStyle ?? 'solid',
      };
  }
}

function evaluateSpans(
  scene: NormalizedSceneConfig,
  values: Record<string, number>
): RenderSpan[] {
  const spans: RenderSpan[] = [];

  for (const [spanName, span] of Object.entries(scene.spans)) {
    const visuals = Object.entries(span.visual ?? {});
    if (visuals.length === 0) {
      const fallback = normalizeSpanVisual(
        spanName,
        span,
        'wire',
        { kind: 'line', material: '#ff8787', width: 1, lineStyle: 'solid' },
        scene.sceneOrigin,
        values
      );
      if (fallback) {
        spans.push(fallback);
      }
      continue;
    }

    for (const [visualName, visual] of visuals) {
      const normalized = normalizeSpanVisual(spanName, span, visualName, visual, scene.sceneOrigin, values);
      if (normalized) {
        spans.push(normalized);
      }
    }
  }

  return spans;
}

function evaluateObjects(
  scene: NormalizedSceneConfig,
  values: Record<string, number>
): Record<string, SceneObjectSnapshot> {
  const snapshots: Record<string, SceneObjectSnapshot> = {};

  for (const [objectName, sceneObject] of Object.entries(scene.objects)) {
    const position = readPosition(values, objectName);
    const rotationMatrix = readRotationMatrix(values, sceneObject.rotationFrame ?? objectName);
    const hasSimulationData =
      position !== null || rotationMatrix !== null || hasRenderableSimulationAnchor(scene, objectName, sceneObject, []);

    snapshots[objectName] = {
      name: objectName,
      position: position ?? vector(0, 0, 0),
      rotationMatrix,
      visuals: hasSimulationData
        ? Object.entries(sceneObject.visual ?? {})
            .map(([visualName, visual]) => normalizeRenderVisual(visualName, visual))
            .filter((visual): visual is RenderVisual => visual !== null)
        : [],
    };
  }

  return snapshots;
}

function evaluateCamera(
  scene: NormalizedSceneConfig,
  objects: Record<string, SceneObjectSnapshot>
): SceneCameraSnapshot {
  const parentFrame = scene.cameraParentFrame || scene.newtonianFrame;
  const parentSnapshot = objects[parentFrame];
  const parentPosition = parentSnapshot?.position ?? vector(0, 0, 0);
  const parentRotation = parentSnapshot?.rotationMatrix ?? null;

  const localEye = fromTuple(scene.cameraEye, vector(3, 3, 3));
  const localFocus = fromTuple(scene.cameraFocus, vector(0, 0, 0));
  const localUp = fromTuple(scene.cameraUp, vector(0, 0, 1));

  return {
    parentFrame,
    parentPosition,
    parentRotationMatrix: parentRotation,
    localEye,
    localFocus,
    localUp,
    worldEye: add(parentPosition, multiplyMatrixVector(parentRotation, localEye)),
    worldFocus: add(parentPosition, multiplyMatrixVector(parentRotation, localFocus)),
    worldUp: multiplyMatrixVector(parentRotation, localUp),
  };
}

export function evaluateScene(
  scene: NormalizedSceneConfig,
  frame: TimelineFrame | undefined
): SceneEvaluation {
  const values = frame?.data ?? {};
  const objects = evaluateObjects(scene, values);

  return {
    objects,
    camera: evaluateCamera(scene, objects),
    spans: evaluateSpans(scene, values),
  };
}
