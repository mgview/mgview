import type { SceneVisual, Vector3Like } from '../core/types.ts';

const MIN_DIMENSION = 1e-6;

export type VisualResizePatch = Partial<
  Pick<SceneVisual, 'size' | 'radius' | 'radius1' | 'radius2' | 'length' | 'scale'>
>;

function clampScale(value: number) {
  return Math.max(Math.abs(value), MIN_DIMENSION);
}

function dominantScale(...values: number[]) {
  return clampScale(
    values.reduce((current, value) =>
      Math.abs(value - 1) > Math.abs(current - 1) ? value : current
    , values[0] ?? 1)
  );
}

export function isVisualResizeSupported(type: SceneVisual['type']) {
  return ['box', 'sphere', 'cylinder', 'cone', 'mesh', 'text', 'basis'].includes(type ?? '');
}

export function resizeVisualFromScale(
  visual: SceneVisual,
  scale: Vector3Like
): VisualResizePatch | null {
  switch (visual.type) {
    case 'box': {
      const size = visual.size ?? { x: 1, y: 1, z: 1 };
      return {
        size: {
          x: Math.max(size.x * clampScale(scale.x), MIN_DIMENSION),
          y: Math.max(size.y * clampScale(scale.y), MIN_DIMENSION),
          z: Math.max(size.z * clampScale(scale.z), MIN_DIMENSION),
        },
      };
    }
    case 'sphere':
      return { radius: Math.max((visual.radius ?? 1) * dominantScale(scale.x, scale.y, scale.z), MIN_DIMENSION) };
    case 'cylinder':
      return {
        radius: Math.max((visual.radius ?? 1) * dominantScale(scale.x, scale.z), MIN_DIMENSION),
        length: Math.max((visual.length ?? 1) * clampScale(scale.y), MIN_DIMENSION),
      };
    case 'cone':
      return {
        radius1: Math.max((visual.radius1 ?? 1) * dominantScale(scale.x, scale.z), MIN_DIMENSION),
        radius2: Math.max((visual.radius2 ?? 1) * dominantScale(scale.x, scale.z), MIN_DIMENSION),
        length: Math.max((visual.length ?? 1) * clampScale(scale.y), MIN_DIMENSION),
      };
    case 'mesh':
    case 'text':
    case 'basis':
      return { scale: Math.max((visual.scale ?? 1) * dominantScale(scale.x, scale.y, scale.z), MIN_DIMENSION) };
    default:
      return null;
  }
}
