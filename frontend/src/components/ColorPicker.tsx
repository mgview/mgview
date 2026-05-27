import { useEffect, useMemo, useRef, useState } from 'react';

import {
  parseCssColorString,
} from '../core/materialPresets.ts';

interface ColorPickerProps {
  value: string;
  onChange: (nextValue: string) => void;
}

function buildColorDraft(value: string) {
  const parsed = parseCssColorString(value);
  if (parsed) {
    return {
      cssText: parsed.cssText,
      hex: parsed.hex,
    };
  }

  return {
    cssText: '#e0f0ff',
    hex: '#e0f0ff',
  };
}

function buildColorLabel(value: string): string {
  const parsed = parseCssColorString(value);
  if (parsed) {
    return parsed.cssText;
  }

  return value.trim() || '#e0f0ff';
}

const PRESET_COLORS = [
  '#e0f0ff',
  '#ffffff',
  '#d9c7ab',
  '#87ceeb',
  '#0f172a',
  '#000000',
];

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [customCssText, setCustomCssText] = useState('#e0f0ff');
  const [customHex, setCustomHex] = useState('#e0f0ff');

  const normalizedValue = useMemo(() => buildColorLabel(value), [value]);

  useEffect(() => {
    const nextDraft = buildColorDraft(value);
    setCustomCssText(nextDraft.cssText);
    setCustomHex(nextDraft.hex);
  }, [value]);

  useEffect(() => {
    if (!pickerOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const eventPath = typeof event.composedPath === 'function' ? event.composedPath() : [];
      if (shellRef.current && eventPath.includes(shellRef.current)) {
        return;
      }

      if (!shellRef.current?.contains(event.target as Node)) {
        setPickerOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPickerOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [pickerOpen]);

  return (
    <div
      className="material-picker-shell"
      ref={shellRef}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
    >
      <button type="button" className="material-trigger" onClick={() => setPickerOpen((open) => !open)}>
        <span
          className="material-trigger-swatch"
          aria-hidden="true"
          style={{ background: normalizedValue }}
        />
        <span className="material-trigger-copy">
          <strong>{normalizedValue}</strong>
          <small>background</small>
        </span>
      </button>

      {pickerOpen ? (
        <div
          className="material-popover"
          role="dialog"
          aria-modal="false"
          aria-label="Background color picker"
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
        >
          <div className="material-popover-header">
            <strong>Background Color</strong>
            <button type="button" className="secondary-button material-popover-close" onClick={() => setPickerOpen(false)}>
              Close
            </button>
          </div>

          <div className="material-picker-section">
            <div className="material-swatch-grid">
              {PRESET_COLORS.map((cssColor) => {
                const isActive = parseCssColorString(normalizedValue)?.cssText === parseCssColorString(cssColor)?.cssText;

                return (
                  <button
                    key={cssColor}
                    type="button"
                    className={`material-swatch-button ${isActive ? 'material-option-active' : ''}`}
                    title={cssColor}
                    onClick={() => onChange(cssColor)}
                  >
                    <span className="material-option-swatch material-option-swatch-large" aria-hidden="true" style={{ background: cssColor }} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="material-picker-section material-picker-custom">
            <div className="material-custom-label">Custom</div>
            <div className="material-custom-controls material-custom-controls-single">
              <input
                type="color"
                aria-label="Background color"
                value={customHex}
                onChange={(event) => {
                  const nextHex = event.target.value;
                  setCustomHex(nextHex);
                  setCustomCssText(nextHex);
                  onChange(nextHex);
                }}
              />
            </div>
            <input
              type="text"
              value={customCssText}
              aria-label="Background CSS color"
              onChange={(event) => {
                const nextText = event.target.value;
                setCustomCssText(nextText);
                const parsed = parseCssColorString(nextText);
                if (parsed) {
                  setCustomHex(parsed.hex);
                  onChange(parsed.cssText);
                }
              }}
              onBlur={() => {
                const parsed = parseCssColorString(customCssText);
                if (parsed) {
                  setCustomCssText(parsed.cssText);
                  setCustomHex(parsed.hex);
                  onChange(parsed.cssText);
                }
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
