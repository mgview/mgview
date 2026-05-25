import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

import type { RenderCableSpan, RenderMaterial, RenderVisual, RgbaColor } from '../core/types.ts';
import { createBasis } from './axisHelpers.ts';
import { toThreeVector } from './coordinateConvention.ts';

export interface RenderAssetContext {
  highlightSelection?: boolean;
  resolveSceneAssetUrl: (assetPath: string) => string;
}

const objLoader = new OBJLoader();
const stlLoader = new STLLoader();
const textureLoader = new THREE.TextureLoader();

const textureCache = new Map<string, Promise<THREE.Texture>>();
const objCache = new Map<string, Promise<THREE.Group>>();
const stlCache = new Map<string, Promise<THREE.BufferGeometry>>();

const LEGACY_PALETTE: Record<string, string> = {
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

const LEGACY_TEXTURES: Record<
  string,
  { path: string; repeat?: [number, number]; color?: string; bumpScale?: number; roughness?: number; metalness?: number }
> = {
  CHECKERBOARD: { path: 'app/textures/checkerboard.jpg', color: '#ffffff', roughness: 0.85, metalness: 0.05 },
  METAL: { path: 'app/textures/metal.jpg', repeat: [2, 2], color: '#ffffff', roughness: 0.35, metalness: 0.75 },
  DIRT: { path: 'app/textures/terrain/backgrounddetailed6.jpg', color: '#ffffff', roughness: 0.95, metalness: 0.02 },
  FOIL: { path: 'app/textures/water.jpg', color: '#ccccaa', roughness: 0.28, metalness: 0.7 },
  WATER: { path: 'app/textures/water.jpg', color: '#3333aa', roughness: 0.12, metalness: 0.15 },
  GRASS: { path: 'app/textures/terrain/grasslight-big.jpg', color: '#ffffff', roughness: 1.0, metalness: 0.0 },
  LAVA: { path: 'app/textures/lavatile.jpg', repeat: [4, 2], color: '#ffffff', roughness: 0.7, metalness: 0.05 },
  MOON: { path: 'app/textures/planets/moon_1024.jpg', color: '#ffffff', roughness: 1.0, metalness: 0.0 },
  EARTH: { path: 'app/textures/planets/earth_atmos_2048.jpg', color: '#ffffff', roughness: 0.85, metalness: 0.0 },
};

function colorFromRgba(color: RgbaColor): THREE.Color {
  return new THREE.Color(color.r, color.g, color.b);
}

function parseCssColorString(value: string | undefined): { color: THREE.Color; opacity?: number } | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const rgbaMatch = trimmed.match(
    /^rgba\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)$/i
  );
  if (rgbaMatch) {
    const [, r, g, b, a] = rgbaMatch;
    return {
      color: new THREE.Color(Number(r) / 255, Number(g) / 255, Number(b) / 255),
      opacity: Number(a),
    };
  }

  const rgbMatch = trimmed.match(/^rgb\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)$/i);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return {
      color: new THREE.Color(Number(r) / 255, Number(g) / 255, Number(b) / 255),
    };
  }

  try {
    return { color: new THREE.Color(trimmed) };
  } catch {
    return null;
  }
}

function colorFromName(materialName: string | undefined): THREE.Color {
  if (!materialName || materialName.trim() === '') {
    return new THREE.Color('#b8c7df');
  }

  const parsed = parseCssColorString(materialName);
  if (parsed) {
    return parsed.color;
  }

  const normalized = materialName.trim().toUpperCase();
  return new THREE.Color(LEGACY_PALETTE[normalized] ?? materialName);
}

function colorFromMaterial(material: RenderMaterial): THREE.Color {
  return material.color ? colorFromRgba(material.color) : colorFromName(material.name);
}

function getOpacity(material: RenderMaterial): number {
  const parsed = parseCssColorString(material.name);
  if (typeof parsed?.opacity === 'number') {
    return parsed.opacity;
  }

  const alpha = material.color?.a;
  return typeof alpha === 'number' ? alpha : 1;
}

function getMaterialKey(material: RenderMaterial): string {
  return material.name.trim().toUpperCase();
}

function loadTexture(url: string, repeat?: [number, number]): Promise<THREE.Texture> {
  const existing = textureCache.get(url);
  if (existing) {
    return existing;
  }

  const promise = new Promise<THREE.Texture>((resolve, reject) => {
    textureLoader.load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        if (repeat) {
          texture.repeat.set(repeat[0], repeat[1]);
        }
        resolve(texture);
      },
      undefined,
      reject
    );
  });

  textureCache.set(url, promise);
  return promise;
}

function createMaterial(visualMaterial: RenderMaterial, context: RenderAssetContext): THREE.MeshPhongMaterial {
  const materialKey = getMaterialKey(visualMaterial);
  const texturePreset = LEGACY_TEXTURES[materialKey];
  const opacity = getOpacity(visualMaterial);
  const color = visualMaterial.color ? colorFromRgba(visualMaterial.color) : colorFromName(visualMaterial.name);

  const material = new THREE.MeshPhongMaterial({
    color: texturePreset?.color ? new THREE.Color(texturePreset.color) : color,
    specular: new THREE.Color(materialKey.startsWith('SHINY_') ? '#ffffff' : '#7f8da3'),
    shininess: texturePreset?.metalness ? 60 : materialKey.startsWith('SHINY_') ? 70 : 30,
    opacity,
    transparent: opacity < 1,
    side: opacity < 1 ? THREE.DoubleSide : THREE.FrontSide,
    depthWrite: opacity >= 1,
  });

  if (texturePreset) {
    void loadTexture(context.resolveSceneAssetUrl(texturePreset.path), texturePreset.repeat)
      .then((texture) => {
        material.map = texture;
        material.needsUpdate = true;
      })
      .catch(() => {
        // Keep the fallback color material if a legacy texture fails to load.
      });
  }

  return material;
}

function cloneMaterialForObject(material: THREE.MeshPhongMaterial) {
  const clone = material.clone();
  clone.map = material.map;
  if (material.emissive) {
    clone.emissive.copy(material.emissive);
    clone.emissiveIntensity = material.emissiveIntensity;
  }
  return clone;
}

function applySelectionHighlight(material: THREE.MeshPhongMaterial) {
  material.emissive = new THREE.Color('#2e7dd7');
  material.emissiveIntensity = 0.18;
}

function finalizeMesh(mesh: THREE.Mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createTextCanvas(text: string, color: string) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  const fontSize = 96;
  context.font = `${fontSize}px Optimer, Georgia, serif`;
  const metrics = context.measureText(text || ' ');
  const padding = 24;
  const width = Math.max(64, Math.ceil(metrics.width + padding * 2));
  const height = 160;

  canvas.width = width;
  canvas.height = height;

  const draw = canvas.getContext('2d');
  if (!draw) {
    return null;
  }

  draw.font = `${fontSize}px Optimer, Georgia, serif`;
  draw.textAlign = 'center';
  draw.textBaseline = 'middle';
  draw.fillStyle = color;
  draw.strokeStyle = 'rgba(255,255,255,0.2)';
  draw.lineWidth = 4;
  draw.strokeText(text || ' ', width / 2, height / 2);
  draw.fillText(text || ' ', width / 2, height / 2);

  return canvas;
}

function createTextVisual(visual: Extract<RenderVisual, { type: 'text' }>) {
  const color = visual.material.color
    ? `rgba(${Math.round(visual.material.color.r * 255)}, ${Math.round(visual.material.color.g * 255)}, ${Math.round(
        visual.material.color.b * 255
      )}, ${visual.material.color.a ?? 1})`
    : `#${colorFromName(visual.material.name).getHexString()}`;
  const canvas = createTextCanvas(visual.text, color);
  if (!canvas) {
    return null;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const aspect = canvas.width / canvas.height;
  const geometry = new THREE.PlaneGeometry(visual.scale * aspect, visual.scale);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  return new THREE.Mesh(geometry, material);
}

function applyMaterialToObject(root: THREE.Object3D, material: THREE.MeshPhongMaterial) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    child.material = cloneMaterialForObject(material);
    child.castShadow = true;
    child.receiveShadow = true;
  });
}

function loadObj(url: string): Promise<THREE.Group> {
  const existing = objCache.get(url);
  if (existing) {
    return existing;
  }

  const promise = new Promise<THREE.Group>((resolve, reject) => {
    objLoader.load(
      url,
      (group) => resolve(group),
      undefined,
      reject
    );
  });

  objCache.set(url, promise);
  return promise;
}

function loadStl(url: string): Promise<THREE.BufferGeometry> {
  const existing = stlCache.get(url);
  if (existing) {
    return existing;
  }

  const promise = new Promise<THREE.BufferGeometry>((resolve, reject) => {
    stlLoader.load(
      url,
      (geometry) => resolve(geometry),
      undefined,
      reject
    );
  });

  stlCache.set(url, promise);
  return promise;
}

function buildMeshVisual(visual: Extract<RenderVisual, { type: 'mesh' }>, context: RenderAssetContext) {
  const assetUrl = context.resolveSceneAssetUrl(visual.path);
  const material = createMaterial(visual.material, context);
  const container = new THREE.Group();

  container.userData.kind = 'mesh-container';
  if (context.highlightSelection) {
    applySelectionHighlight(material);
  }

  const extension = visual.path.split('.').pop()?.toLowerCase();
  if (extension === 'obj') {
    void loadObj(assetUrl)
      .then((template) => {
        const object = template.clone(true);
        object.scale.setScalar(visual.scale);
        applyMaterialToObject(object, material);
        container.add(object);
      })
      .catch(() => {
        material.dispose();
      });
    return container;
  }

  if (extension === 'stl') {
    void loadStl(assetUrl)
      .then((geometry) => {
        const mesh = new THREE.Mesh(geometry.clone(), material);
        mesh.scale.setScalar(visual.scale);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        container.add(mesh);
      })
      .catch(() => {
        material.dispose();
      });
    return container;
  }

  material.dispose();
  return null;
}

export function createVisualMesh(visual: RenderVisual, context: RenderAssetContext) {
  const material = createMaterial(visual.material, context);
  if (context.highlightSelection) {
    applySelectionHighlight(material);
  }

  switch (visual.type) {
    case 'sphere':
      return finalizeMesh(new THREE.Mesh(
        new THREE.SphereGeometry(visual.radius, visual.segmentsWidth, visual.segmentsHeight),
        material
      ));
    case 'box':
      return finalizeMesh(new THREE.Mesh(
        new THREE.BoxGeometry(
          visual.size.x,
          visual.size.y,
          visual.size.z,
          visual.segmentsWidth,
          visual.segmentsHeight,
          visual.segmentsDepth
        ),
        material
      ));
    case 'cylinder':
      return finalizeMesh(new THREE.Mesh(
        new THREE.CylinderGeometry(
          visual.radius,
          visual.radius,
          visual.length,
          visual.segmentsRadius,
          visual.segmentsHeight,
          !visual.capped
        ),
        material
      ));
    case 'cone':
      return finalizeMesh(new THREE.Mesh(
        new THREE.CylinderGeometry(
          visual.radiusTop,
          visual.radiusBottom,
          visual.length,
          visual.segmentsRadius,
          visual.segmentsHeight,
          !visual.capped
        ),
        material
      ));
    case 'torus':
      return finalizeMesh(new THREE.Mesh(
        new THREE.TorusGeometry(
          visual.radius,
          visual.thickness / 2,
          visual.segmentsThickness,
          visual.segmentsRadius,
          visual.arc
        ),
        material
      ));
    case 'mesh':
      return buildMeshVisual(visual, context);
    case 'text':
      material.dispose();
      return createTextVisual(visual);
    case 'basis':
      material.dispose();
      return createBasis(visual.scale);
    default:
      material.dispose();
      return null;
  }
}

export function createCableSpan(span: RenderCableSpan) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    toThreeVector(span.start),
    toThreeVector(span.end),
  ]);
  const material = new THREE.LineBasicMaterial({
    color: colorFromMaterial(span.material),
    opacity: getOpacity(span.material),
    transparent: getOpacity(span.material) < 1,
  });

  const line = new THREE.Line(geometry, material);
  line.userData.kind = 'cable';
  line.userData.thickness = span.thickness;
  return line;
}
