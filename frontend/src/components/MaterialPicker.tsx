import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import type { MaterialDefinition, SceneMaterial } from '../core/types.ts';
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
import { resolveSceneAssetUrl, type SceneAssetRoot } from '../api/sceneAssetUrl.ts';
import { useAnchoredPopoverPlacement } from '../hooks/useAnchoredPopoverPlacement.ts';
import { cn } from '../lib/utils.ts';
import { NumericInput } from './editorShared.tsx';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';

interface MaterialPickerProps {
  compact?: boolean;
  material: SceneMaterial | undefined;
  scenePath?: string;
  sceneAssetRoot?: SceneAssetRoot;
  onMaterialPreviewChange?: (material: MaterialDefinition) => void;
  onMaterialChange: (material: MaterialDefinition) => void;
}

const COLOR_PRESET_ROWS = [
  ['#111827', '#222222', '#7f8da3', '#97a3b5', '#c7d2e2', '#d7e1ee', '#edf3ff', '#f7faff', '#ffffff'],
  ['#ff6b6b', '#ff8787', '#ffa94d', '#ffd43b', '#51cf66', '#69db7c', '#4dabf7', '#74c0fc', '#9775fa'],
] as const;

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

function materialColorText(material: MaterialDefinition, fallbackName: string) {
  if (typeof material.color === 'string') {
    return material.color;
  }
  if (material.color) {
    return formatCssColor(
      material.color.r * 255,
      material.color.g * 255,
      material.color.b * 255,
      material.opacity ?? material.color.a ?? 1
    );
  }
  return fallbackName;
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
    return LEGACY_COLOR_PRESETS[normalizeMaterialName(materialName)] ?? materialName;
  }

  return materialName.trim() || '#c7d2e2';
}

function texturePreviewUrl(path: string): string {
  const normalizedPath = path.replace(/^\/+/, '');
  return resolveBundledAssetUrl(normalizedPath);
}

export default function MaterialPicker({
  compact = false,
  material,
  scenePath = '',
  sceneAssetRoot,
  onMaterialPreviewChange,
  onMaterialChange,
}: MaterialPickerProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const { placementStyle, openUpward } = useAnchoredPopoverPlacement(pickerOpen, shellRef, popoverRef);
  const materialDefinition = useMemo(() => materialDefinitionFromSceneMaterial(material), [material]);
  const legacyMaterialName = materialDefinition.name ?? 'SILVER';
  const materialName = materialColorText(materialDefinition, legacyMaterialName);
  const materialKey = normalizeMaterialName(legacyMaterialName);
  const texturePresetName = materialDefinition.preset
    ?? (isLegacyTextureName(legacyMaterialName) ? materialKey : undefined);
  const hasTexture = Boolean(materialDefinition.texture?.path || texturePresetName);
  const [customCssText, setCustomCssText] = useState('#c7d2e2');
  const [customHex, setCustomHex] = useState('#c7d2e2');
  const [customAlpha, setCustomAlpha] = useState(1);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    const nextDraft = buildCustomDraft(materialName);
    setCustomCssText(nextDraft.cssText);
    setCustomHex(nextDraft.hex);
    setCustomAlpha(materialDefinition.opacity ?? nextDraft.alpha);
  }, [materialDefinition.color, materialDefinition.opacity, materialName]);

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

  const applyColor = (nextColor: string) => {
    const parsed = parseCssColorString(nextColor);
    if (hasTexture) {
      patchMaterial({
        color: parsed?.hex ?? nextColor,
        colorMix: materialDefinition.colorMix ?? 1,
        opacity: parsed?.alpha ?? materialDefinition.opacity ?? 1,
      });
    } else {
      patchMaterial({
        preset: undefined,
        texture: undefined,
        color: parsed?.hex ?? nextColor,
        opacity: parsed?.alpha ?? 1,
      });
    }
  };

  const applyTexturePreset = (preset: string) => {
    const presetRepeat = LEGACY_TEXTURE_PRESETS[preset]?.repeat ?? [1, 1];
    patchMaterial({
      preset,
      texture: { repeat: [...presetRepeat] },
      colorMix: materialDefinition.colorMix ?? 0,
    });
  };

  const patchMaterial = (patch: Partial<MaterialDefinition>, preview = false) => {
    const next = { ...materialDefinition, ...patch };
    delete next.name;
    (preview ? onMaterialPreviewChange ?? onMaterialChange : onMaterialChange)(next);
  };

  const texturePath = materialDefinition.texture?.path
    ?? (texturePresetName ? LEGACY_TEXTURE_PRESETS[texturePresetName]?.path : undefined);
  const repeat = materialDefinition.texture?.repeat ?? [1, 1];
  const offset = materialDefinition.texture?.offset ?? [0, 0];
  const previewTextureUrl = texturePath
    ? (materialDefinition.texture?.path
        ? resolveSceneAssetUrl(scenePath, texturePath, sceneAssetRoot)
        : texturePreviewUrl(texturePath))
    : undefined;
  const parsedTint = parseCssColorString(materialName);
  const colorMix = materialDefinition.colorMix ?? 0;
  const tint = parsedTint
    ? `rgb(${Math.round(255 + (parsedTint.red - 255) * colorMix)} ${Math.round(255 + (parsedTint.green - 255) * colorMix)} ${Math.round(255 + (parsedTint.blue - 255) * colorMix)})`
    : '#ffffff';
  const materialPreviewStyle = previewTextureUrl
    ? {
        backgroundColor: tint,
        backgroundImage: `url("${previewTextureUrl}")`,
        backgroundSize: `${100 / Math.max(0.001, repeat[0])}% ${100 / Math.max(0.001, repeat[1])}%`,
        backgroundPosition: `${offset[0] * 100}% ${offset[1] * 100}%`,
        backgroundBlendMode: 'multiply',
      }
    : { background: materialPreviewBackground(materialName) };

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
        className={cn(
          'grid h-auto w-full grid-cols-[auto_minmax(0,1fr)] items-center text-left',
          compact ? 'min-h-7 gap-1 px-1 py-0.5' : 'min-h-[1.75rem] gap-1.5 px-1.5 py-0.5'
        )}
        onClick={() => setPickerOpen((open) => !open)}
      >
        <span
          className={cn(
            'shrink-0 border border-white/15 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]',
            compact ? 'size-4 rounded' : 'size-5 rounded-[0.32rem]'
          )}
          aria-hidden="true"
          style={materialPreviewStyle}
        />
        <span className="grid min-w-0">
          <strong className={cn('truncate font-semibold leading-tight', compact ? 'text-[0.68rem]' : 'text-[0.74rem]')}>{buildMaterialLabel(texturePresetName ?? materialName)}</strong>
          <small className={cn('leading-tight text-muted-foreground', compact ? 'text-[0.56rem]' : 'text-[0.61rem]')}>
            {hasTexture ? 'texture' : 'color'}
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
                compact && 'material-popover-compact',
                'grid rounded-lg border border-border/50 bg-popover/95 shadow-lg backdrop-blur-sm',
                compact ? 'gap-1.5 p-1.5' : 'gap-2 p-2'
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
            <strong className={cn('font-semibold uppercase tracking-wide text-primary', compact ? 'text-[0.68rem]' : 'text-[0.76rem]')}>Material / Color</strong>
            <Button type="button" variant="outline" size="sm" className={cn(compact && 'h-6 px-2 text-[0.65rem]')} onClick={() => setPickerOpen(false)}>
              Close
            </Button>
          </div>

          <div className={cn('grid', compact ? 'gap-0.5' : 'gap-1')}>
            {COLOR_PRESET_ROWS.map((row, rowIndex) => (
            <div className="material-swatch-grid" key={rowIndex}>
              {row.map((cssColor) => {
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
                    onClick={() => applyColor(cssColor)}
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
            ))}
          </div>

          <div className={cn('grid', compact ? 'gap-1' : 'gap-1.5')}>
            {hasTexture ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 justify-start px-1.5 text-[0.62rem]"
                onClick={() => patchMaterial({
                  preset: undefined,
                  texture: undefined,
                  color: parseCssColorString(materialName)?.hex ?? '#c7d2e2',
                  colorMix: undefined,
                })}
              >
                Use solid color
              </Button>
            ) : null}
            <div className="material-swatch-grid material-swatch-grid-textures">
              {Object.entries(LEGACY_TEXTURE_PRESETS)
                .filter(([name]) => name !== 'FOIL')
                .map(([name, preset]) => (
                <Button
                  key={name}
                  type="button"
                  variant="outline"
                  className={cn(
                    'block h-auto w-full px-1 py-[0.18rem]',
                    texturePresetName === name && 'border-primary/50 bg-accent ring-1 ring-primary/20'
                  )}
                  title={name}
                  onClick={() => applyTexturePreset(name)}
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

          <div className={cn('grid border-t border-border/50', compact ? 'gap-1 pt-1.5' : 'gap-1.5 pt-1.5')}>
            <div className={cn('grid grid-cols-3 items-center', compact ? 'gap-1' : 'gap-1.5')}>
              <input
                type="color"
                aria-label="Custom color"
                className={cn('w-full rounded-md border border-input bg-background p-1', compact ? 'h-7' : 'h-8')}
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
                  applyColor(nextCssText);
                }}
              />
              <NumericInput
                value={materialDefinition.opacity ?? customAlpha}
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
                  if (hasTexture) {
                    patchMaterial({ opacity: nextValue }, true);
                  } else {
                    patchMaterial({ color: customHex, opacity: nextValue }, true);
                  }
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
                  applyColor(nextCssText);
                }}
              />
              <NumericInput
                value={materialDefinition.shininess ?? 30}
                dragStep={1}
                decimalPlaces={1}
                prefixLabel="shine"
                minValue={0}
                maxValue={100}
                onValuePreviewChange={(value) => patchMaterial({ shininess: value }, true)}
                onValueChange={(value) => patchMaterial({ shininess: value })}
              />
            </div>
            <Input
              type="text"
              className={cn(compact && 'h-7 text-[0.68rem]')}
              value={customCssText}
              aria-label="Custom CSS color"
              onChange={(event) => {
                const nextText = event.target.value;
                setCustomCssText(nextText);
                const parsed = parseCssColorString(nextText);
                if (parsed) {
                  setCustomHex(parsed.hex);
                  setCustomAlpha(parsed.alpha);
                  applyColor(parsed.cssText);
                }
              }}
            />
          </div>

          <div className={cn('grid border-t border-border/50', compact ? 'gap-1 pt-1.5' : 'gap-1.5 pt-1.5')}>
            <span className="text-[0.62rem] font-semibold uppercase tracking-wide text-muted-foreground">Custom texture</span>
            <Input
              type="text"
              className={cn(compact && 'h-7 text-[0.68rem]')}
              value={materialDefinition.texture?.path ?? ''}
              placeholder="assets/textures/custom.png"
              aria-label="Custom texture path"
              onChange={(event) => {
                const path = event.target.value;
                patchMaterial({
                  preset: undefined,
                  texture: path
                    ? { ...materialDefinition.texture, path, repeat: materialDefinition.texture?.repeat ?? [1, 1] }
                    : undefined,
                });
              }}
            />
            {hasTexture ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 justify-start px-1.5 text-[0.62rem]"
                  aria-expanded={advancedOpen}
                  onClick={() => setAdvancedOpen((open) => !open)}
                >
                  <span className="mr-1 inline-block w-2.5">{advancedOpen ? '▾' : '▸'}</span>
                  Advanced texture options
                </Button>
                {advancedOpen ? (
                  <div className="grid gap-1.5 border-l border-border/50 pl-2">
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['u', 'v'] as const).map((axis, index) => (
                        <NumericInput
                          key={axis}
                          value={materialDefinition.texture?.repeat?.[index] ?? 1}
                          dragStep={0.05}
                          decimalPlaces={3}
                          prefixLabel={`repeat_${axis}`}
                          minValue={0.001}
                          onValuePreviewChange={(value) => {
                            const repeat: [number, number] = [...(materialDefinition.texture?.repeat ?? [1, 1])];
                            repeat[index] = value;
                            patchMaterial({ texture: { ...materialDefinition.texture, repeat } }, true);
                          }}
                          onValueChange={(value) => {
                            const repeat: [number, number] = [...(materialDefinition.texture?.repeat ?? [1, 1])];
                            repeat[index] = value;
                            patchMaterial({ texture: { ...materialDefinition.texture, repeat } });
                          }}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['u', 'v'] as const).map((axis, index) => (
                        <NumericInput
                          key={axis}
                          value={offset[index]}
                          dragStep={0.01}
                          decimalPlaces={3}
                          prefixLabel={`offset_${axis}`}
                          onValuePreviewChange={(value) => {
                            const nextOffset: [number, number] = [...offset];
                            nextOffset[index] = value;
                            patchMaterial({ texture: { ...materialDefinition.texture, offset: nextOffset } }, true);
                          }}
                          onValueChange={(value) => {
                            const nextOffset: [number, number] = [...offset];
                            nextOffset[index] = value;
                            patchMaterial({ texture: { ...materialDefinition.texture, offset: nextOffset } });
                          }}
                        />
                      ))}
                    </div>
                    <NumericInput
                      value={materialDefinition.texture?.rotation ?? 0}
                      dragStep={0.01}
                      decimalPlaces={3}
                      prefixLabel="rotation"
                      onValuePreviewChange={(rotation) =>
                        patchMaterial({ texture: { ...materialDefinition.texture, rotation } }, true)
                      }
                      onValueChange={(rotation) =>
                        patchMaterial({ texture: { ...materialDefinition.texture, rotation } })
                      }
                    />
                    <NumericInput
                      value={colorMix}
                      dragStep={0.01}
                      decimalPlaces={3}
                      prefixLabel="color mix"
                      minValue={0}
                      maxValue={1}
                      onValuePreviewChange={(value) => patchMaterial({ colorMix: value }, true)}
                      onValueChange={(value) => patchMaterial({ colorMix: value })}
                    />
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
