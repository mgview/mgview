import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import type { SceneMaterial } from '../core/types.ts';
import {
  formatCssColor,
  isLegacyColorName,
  isLegacyTextureName,
  LEGACY_COLOR_PRESETS,
  LEGACY_TEXTURE_PRESETS,
  materialDefinitionFromSceneMaterial,
  materialPreviewBackground,
  normalizeMaterialName,
  parseCssColorString,
} from '../core/materialPresets.ts';
import { resolveBundledAssetUrl } from '../api/localFiles.ts';
import { useAnchoredPopoverPlacement } from '../hooks/useAnchoredPopoverPlacement.ts';
import { cn } from '../lib/utils.ts';
import { NumericInput } from './editorShared.tsx';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';

interface MaterialPickerProps {
  material: SceneMaterial | undefined;
  onMaterialPreviewChange?: (material: { name: string }) => void;
  onMaterialChange: (material: { name: string }) => void;
}

function buildCustomDraft(materialName: string) {
  const parsed = parseCssColorString(materialName);
  if (parsed) {
    return {
      cssText: parsed.cssText,
      hex: parsed.hex,
      alpha: parsed.alpha,
    };
  }

  return {
    cssText: '#c7d2e2',
    hex: '#c7d2e2',
    alpha: 1,
  };
}

function buildMaterialLabel(materialName: string): string {
  if (isLegacyTextureName(materialName)) {
    return materialName.trim().toLowerCase().replace(/_/g, ' ');
  }

  const parsed = parseCssColorString(materialName);
  if (parsed) {
    return parsed.cssText;
  }

  if (isLegacyColorName(materialName)) {
    return LEGACY_COLOR_PRESETS[normalizeMaterialName(materialName)];
  }

  return materialName.trim() || '#c7d2e2';
}

function texturePreviewUrl(path: string): string {
  const normalizedPath = path.replace(/^\/+/, '');
  return resolveBundledAssetUrl(normalizedPath);
}

export default function MaterialPicker({
  material,
  onMaterialPreviewChange,
  onMaterialChange,
}: MaterialPickerProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const { placementStyle, openUpward } = useAnchoredPopoverPlacement(pickerOpen, shellRef, popoverRef);
  const materialDefinition = useMemo(() => materialDefinitionFromSceneMaterial(material), [material]);
  const materialName = materialDefinition.name;
  const materialKey = normalizeMaterialName(materialName);
  const [customCssText, setCustomCssText] = useState('#c7d2e2');
  const [customHex, setCustomHex] = useState('#c7d2e2');
  const [customAlpha, setCustomAlpha] = useState(1);

  useEffect(() => {
    const nextDraft = buildCustomDraft(materialName);
    setCustomCssText(nextDraft.cssText);
    setCustomHex(nextDraft.hex);
    setCustomAlpha(nextDraft.alpha);
  }, [materialName]);

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

  const applyMaterialName = (nextName: string) => {
    onMaterialChange({ name: nextName });
  };

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
          style={{ background: materialPreviewBackground(materialName) }}
        />
        <span className="grid min-w-0">
          <strong className="truncate text-[0.78rem] font-semibold leading-tight">{buildMaterialLabel(materialName)}</strong>
          <small className="text-[0.64rem] leading-tight text-muted-foreground">
            {isLegacyTextureName(materialName) ? 'texture' : 'color'}
          </small>
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
              aria-label="Material picker"
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
            >
          <div className="flex items-center justify-between gap-2">
            <strong className="text-[0.82rem] font-semibold uppercase tracking-wide text-primary">Material / Color</strong>
            <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(false)}>
              Close
            </Button>
          </div>

          <div className="grid gap-2">
            <div className="material-swatch-grid">
              {Object.values(LEGACY_COLOR_PRESETS).map((cssColor) => {
                const isActive =
                  parseCssColorString(materialName)?.cssText === parseCssColorString(cssColor)?.cssText ||
                  normalizeMaterialName(materialName) === normalizeMaterialName(cssColor);

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
                    onClick={() => applyMaterialName(cssColor)}
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

          <div className="grid gap-2">
            <div className="material-swatch-grid material-swatch-grid-textures">
              {Object.entries(LEGACY_TEXTURE_PRESETS).map(([name, preset]) => (
                <Button
                  key={name}
                  type="button"
                  variant="outline"
                  className={cn(
                    'block h-auto w-full px-1 py-[0.18rem]',
                    materialKey === name && 'border-primary/50 bg-accent ring-1 ring-primary/20'
                  )}
                  title={name}
                  onClick={() => applyMaterialName(name)}
                >
                  <span
                    className="material-option-swatch-large material-option-swatch-texture border border-white/15 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
                    aria-hidden="true"
                    style={{
                      backgroundImage: `url("${texturePreviewUrl(preset.path)}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundColor: preset.color ?? '#ffffff',
                    }}
                  />
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-2 border-t border-border/50 pt-2">
            <div className="grid grid-cols-2 items-center gap-2.5">
              <input
                type="color"
                aria-label="Custom color"
                className="h-[38px] w-full rounded-lg border border-input bg-background p-1"
                value={customHex}
                onChange={(event) => {
                  const nextHex = event.target.value;
                  const nextCssText = formatCssColor(
                    Number.parseInt(nextHex.slice(1, 3), 16),
                    Number.parseInt(nextHex.slice(3, 5), 16),
                    Number.parseInt(nextHex.slice(5, 7), 16),
                    customAlpha
                  );
                  setCustomHex(nextHex);
                  setCustomCssText(nextCssText);
                  applyMaterialName(nextCssText);
                }}
              />
              <NumericInput
                value={customAlpha}
                dragStep={0.01}
                decimalPlaces={3}
                prefixLabel="opacity"
                minValue={0}
                maxValue={1}
                onValuePreviewChange={(nextValue) => {
                  const nextCssText = formatCssColor(
                    Number.parseInt(customHex.slice(1, 3), 16),
                    Number.parseInt(customHex.slice(3, 5), 16),
                    Number.parseInt(customHex.slice(5, 7), 16),
                    nextValue
                  );
                  setCustomAlpha(nextValue);
                  setCustomCssText(nextCssText);
                  (onMaterialPreviewChange ?? onMaterialChange)({ name: nextCssText });
                }}
                onValueChange={(nextValue) => {
                  const nextCssText = formatCssColor(
                    Number.parseInt(customHex.slice(1, 3), 16),
                    Number.parseInt(customHex.slice(3, 5), 16),
                    Number.parseInt(customHex.slice(5, 7), 16),
                    nextValue
                  );
                  setCustomAlpha(nextValue);
                  setCustomCssText(nextCssText);
                  applyMaterialName(nextCssText);
                }}
              />
            </div>
            <Input
              type="text"
              value={customCssText}
              aria-label="Custom CSS color"
              onChange={(event) => {
                const nextText = event.target.value;
                setCustomCssText(nextText);
                const parsed = parseCssColorString(nextText);
                if (parsed) {
                  setCustomHex(parsed.hex);
                  setCustomAlpha(parsed.alpha);
                  applyMaterialName(parsed.cssText);
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
