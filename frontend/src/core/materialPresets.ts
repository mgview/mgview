import type { MaterialDefinition, SceneMaterial } from './types.ts';

export const LEGACY_COLOR_PRESETS: Record<string, string> = {
  SILVER: '#c7d2e2',
  SHINY_SILVER: '#d7e1ee',
  GRAY: '#7f8da3',
  GREY: '#7f8da3',
  SHINY_GRAY: '#97a3b5',
  WHITE: '#edf3ff',
  SHINY_WHITE: '#f7faff',
  BLACK: '#111827',
  SHINY_BLACK: '#222222',
  RED: '#ff6b6b',
  SHINY_RED: '#ff8787',
  GREEN: '#51cf66',
  SHINY_GREEN: '#69db7c',
  BLUE: '#4dabf7',
  SHINY_BLUE: '#74c0fc',
  YELLOW: '#ffd43b',
  ORANGE: '#ffa94d',
  PURPLE: '#9775fa',
};

export const LEGACY_TEXTURE_PRESETS: Record<
  string,
  {
    path: string;
    repeat?: [number, number];
    color?: string;
    bumpScale?: number;
    roughness?: number;
    metalness?: number;
    previewBackground: string;
  }
> = {
  CHECKERBOARD: {
    path: 'assets/textures/checkerboard.jpg',
    color: '#ffffff',
    roughness: 0.85,
    metalness: 0.05,
    previewBackground:
      'linear-gradient(45deg, #f8fafc 25%, #0f172a 25%, #0f172a 50%, #f8fafc 50%, #f8fafc 75%, #0f172a 75%) 0 0 / 16px 16px',
  },
  METAL: {
    path: 'assets/textures/metal.jpg',
    repeat: [2, 2],
    color: '#ffffff',
    roughness: 0.35,
    metalness: 0.75,
    previewBackground: 'linear-gradient(135deg, #d4dbe5 0%, #8d99aa 45%, #eef2f7 100%)',
  },
  DIRT: {
    path: 'assets/textures/terrain/backgrounddetailed6.jpg',
    color: '#ffffff',
    roughness: 0.95,
    metalness: 0.02,
    previewBackground: 'linear-gradient(135deg, #5b4634 0%, #8b6a4c 52%, #3f2f25 100%)',
  },
  FOIL: {
    path: 'assets/textures/water.jpg',
    color: '#ccccaa',
    roughness: 0.28,
    metalness: 0.7,
    previewBackground: 'linear-gradient(135deg, #ece7c7 0%, #9db4c7 40%, #f4efcf 100%)',
  },
  WATER: {
    path: 'assets/textures/water.jpg',
    color: '#3333aa',
    roughness: 0.12,
    metalness: 0.15,
    previewBackground: 'linear-gradient(135deg, #254f99 0%, #63b3ff 50%, #173b77 100%)',
  },
  GRASS: {
    path: 'assets/textures/terrain/grasslight-big.jpg',
    color: '#ffffff',
    roughness: 1.0,
    metalness: 0.0,
    previewBackground: 'linear-gradient(135deg, #356f34 0%, #8ecf59 48%, #274e24 100%)',
  },
  LAVA: {
    path: 'assets/textures/lavatile.jpg',
    repeat: [4, 2],
    color: '#ffffff',
    roughness: 0.7,
    metalness: 0.05,
    previewBackground: 'linear-gradient(135deg, #2b0f0f 0%, #ff6a00 40%, #7a1300 100%)',
  },
  MOON: {
    path: 'assets/textures/planets/moon_1024.jpg',
    color: '#ffffff',
    roughness: 1.0,
    metalness: 0.0,
    previewBackground: 'linear-gradient(135deg, #a6a8af 0%, #e3e5ea 55%, #73767c 100%)',
  },
  EARTH: {
    path: 'assets/textures/planets/earth_atmos_2048.jpg',
    color: '#ffffff',
    roughness: 0.85,
    metalness: 0.0,
    previewBackground: 'linear-gradient(135deg, #1d5fa8 0%, #49a164 45%, #cbdcf6 100%)',
  },
};

export interface ParsedCssColor {
  red: number;
  green: number;
  blue: number;
  alpha: number;
  cssText: string;
  hex: string;
}

export function normalizeMaterialName(name: string | undefined): string {
  return name?.trim().toUpperCase() ?? '';
}

export function materialDefinitionFromSceneMaterial(material: SceneMaterial | undefined): MaterialDefinition {
  if (typeof material === 'string') {
    return { name: material };
  }

  return {
    name: material?.name ?? 'SILVER',
    color: material?.color,
  };
}

export function isLegacyTextureName(name: string | undefined): boolean {
  return Object.hasOwn(LEGACY_TEXTURE_PRESETS, normalizeMaterialName(name));
}

export function isLegacyColorName(name: string | undefined): boolean {
  return Object.hasOwn(LEGACY_COLOR_PRESETS, normalizeMaterialName(name));
}

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function clampAlpha(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function toHexByte(value: number): string {
  return clampByte(value).toString(16).padStart(2, '0');
}

export function formatCssColor(red: number, green: number, blue: number, alpha = 1): string {
  const normalizedAlpha = clampAlpha(alpha);
  if (normalizedAlpha >= 0.999) {
    return `#${toHexByte(red)}${toHexByte(green)}${toHexByte(blue)}`;
  }

  const alphaText = normalizedAlpha.toFixed(3).replace(/\.?0+$/, '');
  return `rgba(${clampByte(red)}, ${clampByte(green)}, ${clampByte(blue)}, ${alphaText})`;
}

function expandShortHex(hex: string): string {
  return hex
    .split('')
    .map((character) => `${character}${character}`)
    .join('');
}

export function parseCssColorString(value: string | undefined): ParsedCssColor | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const hexMatch = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hexMatch) {
    let payload = hexMatch[1];
    if (payload.length === 3 || payload.length === 4) {
      payload = expandShortHex(payload);
    }

    const red = Number.parseInt(payload.slice(0, 2), 16);
    const green = Number.parseInt(payload.slice(2, 4), 16);
    const blue = Number.parseInt(payload.slice(4, 6), 16);
    const alpha = payload.length === 8 ? Number.parseInt(payload.slice(6, 8), 16) / 255 : 1;
    return {
      red,
      green,
      blue,
      alpha,
      cssText: formatCssColor(red, green, blue, alpha),
      hex: `#${toHexByte(red)}${toHexByte(green)}${toHexByte(blue)}`,
    };
  }

  const rgbaMatch = trimmed.match(
    /^rgba\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)$/i
  );
  if (rgbaMatch) {
    const [, red, green, blue, alpha] = rgbaMatch;
    const parsed = {
      red: clampByte(Number(red)),
      green: clampByte(Number(green)),
      blue: clampByte(Number(blue)),
      alpha: clampAlpha(Number(alpha)),
    };
    return {
      ...parsed,
      cssText: formatCssColor(parsed.red, parsed.green, parsed.blue, parsed.alpha),
      hex: `#${toHexByte(parsed.red)}${toHexByte(parsed.green)}${toHexByte(parsed.blue)}`,
    };
  }

  const rgbMatch = trimmed.match(/^rgb\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)$/i);
  if (rgbMatch) {
    const [, red, green, blue] = rgbMatch;
    const parsed = {
      red: clampByte(Number(red)),
      green: clampByte(Number(green)),
      blue: clampByte(Number(blue)),
      alpha: 1,
    };
    return {
      ...parsed,
      cssText: formatCssColor(parsed.red, parsed.green, parsed.blue, 1),
      hex: `#${toHexByte(parsed.red)}${toHexByte(parsed.green)}${toHexByte(parsed.blue)}`,
    };
  }

  return null;
}

export function materialPreviewBackground(name: string | undefined): string {
  const normalized = normalizeMaterialName(name);
  const texturePreset = LEGACY_TEXTURE_PRESETS[normalized];
  if (texturePreset) {
    return texturePreset.previewBackground;
  }

  const colorPreset = LEGACY_COLOR_PRESETS[normalized];
  if (colorPreset) {
    return colorPreset;
  }

  return name?.trim() || '#b8c7df';
}
