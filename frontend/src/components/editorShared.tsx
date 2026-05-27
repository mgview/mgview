import { useEffect, useRef, useState } from 'react';
import type { SceneMaterial, SceneVisual, Vector3Like, VisualType } from '../core/types.ts';

export const VISUAL_TYPE_OPTIONS: VisualType[] = [
  'sphere',
  'box',
  'cylinder',
  'cone',
  'torus',
  'grid',
  'mesh',
  'text',
  'basis',
];

export const DEFAULT_NEW_VISUAL_WORKSPACE_FRACTION = 0.5;

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
  | 'segments_thickness'
  | 'cell_size'
  | 'count_x'
  | 'count_y';

const EDITABLE_KEYS_BY_TYPE: Partial<Record<VisualType, EditableScalarKey[]>> = {
  sphere: ['radius', 'segments_width', 'segments_height'],
  box: ['segments_width', 'segments_height', 'segments_depth'],
  cylinder: ['radius', 'length', 'capped', 'segments_radius', 'segments_height'],
  cone: ['radius1', 'radius2', 'length', 'capped', 'segments_radius', 'segments_height'],
  torus: ['radius', 'thickness', 'arc', 'segments_radius', 'segments_thickness'],
  grid: ['cell_size', 'count_x', 'count_y'],
  mesh: ['path', 'scale'],
  text: ['text', 'scale'],
  basis: ['scale'],
};

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

function defaultVisualTargetSize(workspaceSize?: number): number {
  if (!Number.isFinite(workspaceSize) || !workspaceSize || workspaceSize <= 0) {
    return 1;
  }

  return workspaceSize * DEFAULT_NEW_VISUAL_WORKSPACE_FRACTION;
}

export function createDefaultVisual(type: VisualType, material?: SceneMaterial, workspaceSize?: number): SceneVisual {
  const targetSize = defaultVisualTargetSize(workspaceSize);
  const sphereRadius = targetSize * 0.5;
  const boxSize = targetSize;
  const cylinderRadius = targetSize * 0.125;
  const cylinderLength = targetSize;
  const coneRadius = targetSize * 0.125;
  const torusRadius = targetSize * 0.35;
  const torusThickness = targetSize * 0.12;
  const gridCount = 10;
  const gridCellSize = (targetSize / gridCount) * 4;
  const scale = targetSize * 0.5;

  const shared = {
    visible: true,
    type,
    position: vector(0, 0, 0),
    rotation: vector(0, 0, 0),
    material: cloneMaterial(material) ?? { name: 'SILVER' },
  } satisfies Partial<SceneVisual>;

  switch (type) {
    case 'sphere':
      return { ...shared, type, radius: sphereRadius, segments_width: 16, segments_height: 12 };
    case 'box':
      return {
        ...shared,
        type,
        size: vector(boxSize, boxSize, boxSize),
        segments_width: 1,
        segments_height: 1,
        segments_depth: 1,
      };
    case 'cylinder':
      return {
        ...shared,
        type,
        radius: cylinderRadius,
        length: cylinderLength,
        capped: true,
        segments_radius: 16,
        segments_height: 1,
      };
    case 'cone':
      return {
        ...shared,
        type,
        radius1: coneRadius,
        radius2: coneRadius,
        length: cylinderLength,
        capped: true,
        segments_radius: 12,
        segments_height: 1,
      };
    case 'torus':
      return {
        ...shared,
        type,
        radius: torusRadius,
        thickness: torusThickness,
        segments_radius: 12,
        segments_thickness: 8,
      };
    case 'grid':
      return {
        ...shared,
        type,
        cell_size: gridCellSize,
        count_x: gridCount,
        count_y: gridCount,
      };
    case 'mesh':
      return { ...shared, type, scale, path: '' };
    case 'text':
      return { ...shared, type, scale, text: '' };
    case 'basis':
      return { ...shared, type, scale };
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

function formatEditableNumber(value: number, decimalPlaces: number): string {
  if (!Number.isFinite(value)) {
    return '';
  }

  return value.toFixed(decimalPlaces).replace(/\.?0+$/, '');
}

function roundToDecimalPlaces(value: number, decimalPlaces: number): number {
  if (!Number.isFinite(value)) {
    return value;
  }

  return Number(value.toFixed(decimalPlaces));
}

function normalizeEditableNumber(
  value: number,
  {
    minValue,
    maxValue,
    integer,
    decimalPlaces,
  }: {
    minValue?: number;
    maxValue?: number;
    integer?: boolean;
    decimalPlaces: number;
  }
): number {
  if (!Number.isFinite(value)) {
    return value;
  }

  let nextValue = value;
  if (typeof minValue === 'number') {
    nextValue = Math.max(minValue, nextValue);
  }
  if (typeof maxValue === 'number') {
    nextValue = Math.min(maxValue, nextValue);
  }

  return integer ? Math.round(nextValue) : roundToDecimalPlaces(nextValue, decimalPlaces);
}

export function getEditableScalarKeys(visual: SceneVisual): EditableScalarKey[] {
  const orderedKeys = EDITABLE_KEYS_BY_TYPE[visual.type ?? ''] ?? [];

  return orderedKeys.filter((key) => visual[key] !== undefined);
}

export function NumericInput({
  value,
  onValueChange,
  dragStep = 0.01,
  className,
  prefixLabel,
  decimalPlaces = 3,
  minValue,
  maxValue,
  integer = false,
}: {
  value: number;
  onValueChange: (value: number) => void;
  dragStep?: number;
  className?: string;
  prefixLabel?: string;
  decimalPlaces?: number;
  minValue?: number;
  maxValue?: number;
  integer?: boolean;
}) {
  const [text, setText] = useState(formatEditableNumber(value, decimalPlaces));
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startY: number;
    startValue: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    setText(formatEditableNumber(value, decimalPlaces));
  }, [decimalPlaces, value]);

  const finalizeDrag = (pointerId?: number) => {
    const dragState = dragRef.current;
    dragRef.current = null;
    setIsDragging(false);
    if (pointerId !== undefined && shellRef.current?.hasPointerCapture(pointerId)) {
      shellRef.current.releasePointerCapture(pointerId);
    }
    if (dragState && !dragState.moved) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  };

  useEffect(() => {
    const handleWindowPointerUp = () => {
      if (dragRef.current) {
        finalizeDrag(dragRef.current.pointerId);
      }
    };

    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);
    window.addEventListener('blur', handleWindowPointerUp);

    return () => {
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
      window.removeEventListener('blur', handleWindowPointerUp);
    };
  }, []);

  return (
    <div
      ref={shellRef}
      className={`numeric-input-shell ${isDragging ? 'numeric-input-shell-dragging' : ''} ${className ?? ''}`.trim()}
      onPointerDown={(event) => {
        if (event.button !== 0) {
          return;
        }

        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);

        dragRef.current = {
          pointerId: event.pointerId,
          startY: event.clientY,
          startValue: value,
          moved: false,
        };
      }}
      onPointerMove={(event) => {
        const dragState = dragRef.current;
        if (!dragState || dragState.pointerId !== event.pointerId) {
          return;
        }

        const deltaY = dragState.startY - event.clientY;
        if (Math.abs(deltaY) < 3) {
          return;
        }

        dragState.moved = true;
        setIsDragging(true);
        const rawValue = dragState.startValue + deltaY * dragStep;
        const nextValue = normalizeEditableNumber(rawValue, {
          minValue,
          maxValue,
          integer,
          decimalPlaces,
        });
        setText(formatEditableNumber(nextValue, decimalPlaces));
        onValueChange(nextValue);
      }}
      onPointerUp={(event) => finalizeDrag(event.pointerId)}
      onPointerCancel={(event) => finalizeDrag(event.pointerId)}
    >
      {prefixLabel ? (
        <div className="numeric-input-prefix" aria-hidden="true">
          {prefixLabel}
        </div>
      ) : null}
      <input
        ref={inputRef}
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
            onValueChange(
              normalizeEditableNumber(nextValue, {
                minValue,
                maxValue,
                integer,
                decimalPlaces,
              })
            );
          }
        }}
        onBlur={() => {
          const nextValue = Number(text);
          if (text.trim() === '' || !Number.isFinite(nextValue)) {
            setText(formatEditableNumber(value, decimalPlaces));
            return;
          }

          const roundedValue = normalizeEditableNumber(nextValue, {
            minValue,
            maxValue,
            integer,
            decimalPlaces,
          });
          setText(formatEditableNumber(roundedValue, decimalPlaces));
          onValueChange(roundedValue);
        }}
      />
      <div className="numeric-input-grip" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
