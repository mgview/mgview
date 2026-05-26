import { useEffect, useState } from 'react';
import type { SceneVisual } from '../core/types.ts';

export type EditableScalarKey =
  | 'text'
  | 'path'
  | 'scale'
  | 'radius'
  | 'radius1'
  | 'radius2'
  | 'length'
  | 'thickness'
  | 'capped';

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
    'text',
    'path',
    'scale',
    'radius',
    'radius1',
    'radius2',
    'length',
    'thickness',
    'capped',
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
