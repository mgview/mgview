import { useEffect, useMemo, useRef, useState } from 'react';

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
import { resolveAppAssetUrl } from '../api/localFiles.ts';
import { NumericInput } from './editorShared.tsx';

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
  return resolveAppAssetUrl(normalizedPath);
}

export default function MaterialPicker({
  material,
  onMaterialPreviewChange,
  onMaterialChange,
}: MaterialPickerProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
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
      <button type="button" className="material-trigger" onClick={() => setPickerOpen((open) => !open)}>
        <span
          className="material-trigger-swatch"
          aria-hidden="true"
          style={{ background: materialPreviewBackground(materialName) }}
        />
        <span className="material-trigger-copy">
          <strong>{buildMaterialLabel(materialName)}</strong>
          <small>{isLegacyTextureName(materialName) ? 'texture' : 'color'}</small>
        </span>
      </button>

      {pickerOpen ? (
        <div
          className="material-popover"
          role="dialog"
          aria-modal="false"
          aria-label="Material picker"
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
        >
          <div className="material-popover-header">
            <strong>Material / Color</strong>
            <button type="button" className="secondary-button material-popover-close" onClick={() => setPickerOpen(false)}>
              Close
            </button>
          </div>

          <div className="material-picker-section">
            <div className="material-swatch-grid">
              {Object.values(LEGACY_COLOR_PRESETS).map((cssColor) => {
                const isActive =
                  parseCssColorString(materialName)?.cssText === parseCssColorString(cssColor)?.cssText ||
                  normalizeMaterialName(materialName) === normalizeMaterialName(cssColor);

                return (
                  <button
                    key={cssColor}
                    type="button"
                    className={`material-swatch-button ${isActive ? 'material-option-active' : ''}`}
                    title={cssColor}
                    onClick={() => applyMaterialName(cssColor)}
                  >
                    <span className="material-option-swatch material-option-swatch-large" aria-hidden="true" style={{ background: cssColor }} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="material-picker-section">
            <div className="material-swatch-grid material-swatch-grid-textures">
              {Object.entries(LEGACY_TEXTURE_PRESETS).map(([name, preset]) => (
                <button
                  key={name}
                  type="button"
                  className={`material-swatch-button material-swatch-button-texture ${materialKey === name ? 'material-option-active' : ''}`}
                  title={name}
                  onClick={() => applyMaterialName(name)}
                >
                  <span
                    className="material-option-swatch material-option-swatch-large material-option-swatch-texture"
                    aria-hidden="true"
                    style={{
                      backgroundImage: `url("${texturePreviewUrl(preset.path)}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundColor: preset.color ?? '#ffffff',
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="material-picker-section material-picker-custom">
            <div className="material-custom-controls">
              <input
                type="color"
                aria-label="Custom color"
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
            <input
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
        </div>
      ) : null}
    </div>
  );
}
