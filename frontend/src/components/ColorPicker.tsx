import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  parseCssColorString,
} from '../core/materialPresets.ts';
import { useAnchoredPopoverPlacement } from '../hooks/useAnchoredPopoverPlacement.ts';
import { cn } from '../lib/utils.ts';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';

interface ColorPickerProps {
  label?: string;
  popoverTitle?: string;
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

export default function ColorPicker({
  label = 'color',
  popoverTitle = 'Color',
  value,
  onChange,
}: ColorPickerProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const { placementStyle, openUpward } = useAnchoredPopoverPlacement(pickerOpen, shellRef, popoverRef);
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
      const target = event.target as Node;
      if (shellRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }

      setPickerOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setPickerOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape, true);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape, true);
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
      <Button
        type="button"
        variant="outline"
        className="grid h-auto min-h-[1.85rem] w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5 px-1.5 py-1 text-left"
        onClick={() => setPickerOpen((open) => !open)}
      >
        <span
          className="size-[1.35rem] shrink-0 rounded-[0.38rem] border border-white/15 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
          aria-hidden="true"
          style={{ background: normalizedValue }}
        />
        <span className="grid min-w-0">
          <strong className="truncate text-[0.78rem] font-semibold leading-tight">{normalizedValue}</strong>
          <small className="text-[0.64rem] leading-tight text-muted-foreground">{label}</small>
        </span>
      </Button>

      {pickerOpen
        ? createPortal(
            <div
              ref={popoverRef}
              style={placementStyle}
              className={cn(
                'material-popover',
                'grid gap-2.5 rounded-xl border border-border/50 bg-popover/95 p-2.5 shadow-lg backdrop-blur-sm'
              )}
              data-open-direction={openUpward ? 'up' : 'down'}
              role="dialog"
              aria-modal="false"
              aria-label={`${popoverTitle} picker`}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
            >
          <div className="flex items-center justify-between gap-2">
            <strong className="text-[0.82rem] font-semibold uppercase tracking-wide text-primary">{popoverTitle}</strong>
            <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(false)}>
              Close
            </Button>
          </div>

          <div className="grid gap-2">
            <div className="material-swatch-grid">
              {PRESET_COLORS.map((cssColor) => {
                const isActive = parseCssColorString(normalizedValue)?.cssText === parseCssColorString(cssColor)?.cssText;

                return (
                  <Button
                    key={cssColor}
                    type="button"
                    variant="outline"
                    className={cn(
                      'block h-auto w-full p-1',
                      isActive && 'border-primary/50 bg-accent ring-1 ring-primary/20'
                    )}
                    title={cssColor}
                    onClick={() => onChange(cssColor)}
                  >
                    <span
                      className="material-option-swatch-large border border-white/15 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
                      aria-hidden="true"
                      style={{ background: cssColor }}
                    />
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-2 border-t border-border/50 pt-2">
            <div className="text-[0.72rem] uppercase tracking-wide text-muted-foreground">Custom</div>
            <div className="grid grid-cols-1 items-center gap-2.5">
              <input
                type="color"
                aria-label={label}
                className="h-[38px] w-full rounded-lg border border-input bg-background p-1"
                value={customHex}
                onChange={(event) => {
                  const nextHex = event.target.value;
                  setCustomHex(nextHex);
                  setCustomCssText(nextHex);
                  onChange(nextHex);
                }}
              />
            </div>
            <Input
              type="text"
              value={customCssText}
              aria-label={`${label} CSS color`}
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
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
