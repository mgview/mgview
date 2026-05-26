import { useEffect, useState } from 'react';
import type { SceneMaterial, SceneVisual, Vector3Like, VisualType } from '../core/types.ts';

export const VISUAL_TYPE_OPTIONS: VisualType[] = [
  'sphere',
  'box',
  'cylinder',
  'cone',
  'torus',
  'mesh',
  'text',
  'basis',
];

export type EditableScalarKey =
  | 'arc'
  | 'text'
  | 'path'
  | 'scale'
  | 'radius'
  | 'radius1'
  | 'radius2'
  | 'length'
  | 'thickness'
  | 'capped'
  | 'segments_width'
  | 'segments_height'
  | 'segments_depth'
  | 'segments_radius'
  | 'segments_thickness';

function vector(x = 0, y = 0, z = 0): Vector3Like {
  return { x, y, z };
}

function cloneMaterial(material: SceneMaterial | undefined): SceneMaterial | undefined {
  if (typeof material === 'string' || material === undefined) {
    return material;
  }

  return { ...material };
}

export function radiansToDegrees(value: number): number {
  return (value * 180) / Math.PI;
}

export function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function createDefaultVisual(type: VisualType, material?: SceneMaterial): SceneVisual {
  const shared = {
    visible: true,
    type,
    position: vector(0, 0, 0),
    rotation: vector(0, 0, 0),
    material: cloneMaterial(material) ?? { name: 'SILVER' },
  } satisfies Partial<SceneVisual>;

  switch (type) {
    case 'sphere':
      return { ...shared, type, radius: 1, segments_width: 16, segments_height: 12 };
    case 'box':
      return {
        ...shared,
        type,
        size: vector(1, 1, 1),
        segments_width: 1,
        segments_height: 1,
        segments_depth: 1,
      };
    case 'cylinder':
      return {
        ...shared,
        type,
        radius: 0.1,
        length: 1,
        capped: true,
        segments_radius: 16,
        segments_height: 1,
      };
    case 'cone':
      return {
        ...shared,
        type,
        radius1: 0.1,
        radius2: 0.1,
        length: 1,
        capped: true,
        segments_radius: 12,
        segments_height: 1,
      };
    case 'torus':
      return {
        ...shared,
        type,
        radius: 1,
        thickness: 0.1,
        segments_radius: 12,
        segments_thickness: 8,
      };
    case 'mesh':
      return { ...shared, type, scale: 1, path: '' };
    case 'text':
      return { ...shared, type, scale: 1, text: '' };
    case 'basis':
      return { ...shared, type, scale: 1 };
    default:
      return { ...shared, type };
  }
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }

  if (Math.abs(value) >= 1000 || (Math.abs(value) > 0 && Math.abs(value) < 0.001)) {
    return value.toExponential(3);
  }

  return value.toFixed(4).replace(/\.?0+$/, '');
}

export function formatVector(value: { x: number; y: number; z: number } | null): string {
  if (!value) {
    return 'n/a';
  }

  return `${formatNumber(value.x)}, ${formatNumber(value.y)}, ${formatNumber(value.z)}`;
}

export function getEditableScalarKeys(visual: SceneVisual): EditableScalarKey[] {
  const orderedKeys: EditableScalarKey[] = [
    'arc',
    'text',
    'path',
    'scale',
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
  ];

  return orderedKeys.filter((key) => visual[key] !== undefined);
}

export function NumericInput({
  value,
  onValueChange,
}: {
  value: number;
  onValueChange: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onChange={(event) => {
        const nextText = event.target.value;
        setText(nextText);

        if (nextText.trim() === '') {
          return;
        }

        const nextValue = Number(nextText);
        if (Number.isFinite(nextValue)) {
          onValueChange(nextValue);
        }
      }}
      onBlur={() => {
        const nextValue = Number(text);
        if (text.trim() === '' || !Number.isFinite(nextValue)) {
          setText(String(value));
          return;
        }

        setText(String(nextValue));
        onValueChange(nextValue);
      }}
    />
  );
}
