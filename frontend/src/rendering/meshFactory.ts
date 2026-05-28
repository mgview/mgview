import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

import type { RenderMaterial, RenderSpan, RenderVisual, RgbaColor } from '../core/types.ts';
import {
  LEGACY_COLOR_PRESETS,
  LEGACY_TEXTURE_PRESETS,
  normalizeMaterialName,
  parseCssColorString,
} from '../core/materialPresets.ts';
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

function colorFromRgba(color: RgbaColor): THREE.Color {
  return new THREE.Color(color.r, color.g, color.b);
}

function colorFromName(materialName: string | undefined): THREE.Color {
  if (!materialName || materialName.trim() === '') {
    return new THREE.Color('#b8c7df');
  }

  const parsed = parseCssColorString(materialName);
  if (parsed) {
    return new THREE.Color(parsed.red / 255, parsed.green / 255, parsed.blue / 255);
  }

  const normalized = normalizeMaterialName(materialName);
  const presetColor = LEGACY_COLOR_PRESETS[normalized] ?? LEGACY_TEXTURE_PRESETS[normalized]?.color;
  return new THREE.Color(presetColor ?? '#b8c7df');
}

function colorFromMaterial(material: RenderMaterial): THREE.Color {
  return material.color ? colorFromRgba(material.color) : colorFromName(material.name);
}

function getOpacity(material: RenderMaterial): number {
  const parsed = parseCssColorString(material.name);
  if (typeof parsed?.alpha === 'number') {
    return parsed.alpha;
  }

  const alpha = material.color?.a;
  return typeof alpha === 'number' ? alpha : 1;
}

function getMaterialKey(material: RenderMaterial): string {
  return normalizeMaterialName(material.name);
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
  const texturePreset = LEGACY_TEXTURE_PRESETS[materialKey];
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

function createGridVisual(visual: Extract<RenderVisual, { type: 'grid' }>, highlightSelection: boolean | undefined) {
  const countX = Math.max(1, Math.round(visual.countX));
  const countY = Math.max(1, Math.round(visual.countY));
  const cellSize = Math.max(0, visual.cellSize);
  const width = countX * cellSize;
  const height = countY * cellSize;
  const xStart = -width / 2;
  const xEnd = width / 2;
  const zStart = -height / 2;
  const zEnd = height / 2;
  const positions: number[] = [];

  for (let xIndex = 0; xIndex <= countX; xIndex += 1) {
    const x = xStart + xIndex * cellSize;
    positions.push(x, 0, zStart, x, 0, zEnd);
  }

  for (let yIndex = 0; yIndex <= countY; yIndex += 1) {
    const z = zStart + yIndex * cellSize;
    positions.push(xStart, 0, z, xEnd, 0, z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const opacity = getOpacity(visual.material);
  const material = new THREE.LineBasicMaterial({
    color: highlightSelection ? new THREE.Color('#2e7dd7') : colorFromMaterial(visual.material),
    opacity,
    transparent: opacity < 1,
  });

  return new THREE.LineSegments(geometry, material);
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
    case 'grid':
      material.dispose();
      return createGridVisual(visual, context.highlightSelection);
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

function createSpanSegment(
  start: THREE.Vector3,
  end: THREE.Vector3,
  width: number,
  material: THREE.Material,
  segmentsRadius: number,
  segmentsLength: number
) {
  const direction = end.clone().sub(start);
  const length = direction.length();
  if (!Number.isFinite(length) || length <= 1e-9) {
    return null;
  }

  const radius = Math.max(width / 2, 1e-4);
  const geometry = new THREE.CylinderGeometry(
    radius,
    radius,
    length,
    segmentsRadius,
    segmentsLength,
    false
  );
  const mesh = finalizeMesh(new THREE.Mesh(geometry, material));
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  mesh.position.copy(midpoint);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}

function createLineSpan(span: Extract<RenderSpan, { kind: 'line' }>) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    toThreeVector(span.start),
    toThreeVector(span.end),
  ]);
  const color = colorFromMaterial(span.material);
  const opacity = getOpacity(span.material);
  const material =
    span.lineStyle === 'dashed'
      ? new THREE.LineDashedMaterial({
          color,
          opacity,
          transparent: opacity < 1,
          dashSize: 0.12,
          gapSize: 0.08,
        })
      : new THREE.LineBasicMaterial({
          color,
          opacity,
          transparent: opacity < 1,
        });

  const line = new THREE.Line(geometry, material);
  if (span.lineStyle === 'dashed') {
    line.computeLineDistances();
  }
  line.userData.kind = 'span-line';
  line.userData.width = span.width;
  return line;
}

function createCylinderSpan(span: Extract<RenderSpan, { kind: 'cylinder' }>, context: RenderAssetContext) {
  const material = createMaterial(span.material, context);
  return createSpanSegment(
    toThreeVector(span.start),
    toThreeVector(span.end),
    span.width,
    material,
    span.segmentsRadius,
    span.segmentsLength
  );
}

function createSpringSpan(span: Extract<RenderSpan, { kind: 'spring' }>, context: RenderAssetContext) {
  const start = toThreeVector(span.start);
  const end = toThreeVector(span.end);
  const direction = end.clone().sub(start);
  const totalLength = direction.length();
  if (!Number.isFinite(totalLength) || totalLength <= 1e-9) {
    return null;
  }

  const group = new THREE.Group();
  group.userData.kind = 'span-spring';
  const normalizedDirection = direction.clone().normalize();
  const naturalLength = Math.max(span.naturalLength, 0);

  const coilMaterial = createMaterial(span.material, context);
  const stretchMaterial = createMaterial(span.stretchMaterial, context);

  if (totalLength <= naturalLength || naturalLength <= 1e-9) {
    const coil = createSpanSegment(start, end, span.coilWidth, coilMaterial, span.segmentsRadius, 2);
    if (coil) {
      group.add(coil);
    }
    return group;
  }

  const stretchLength = (totalLength - naturalLength) / 2;
  const middleStart = start.clone().addScaledVector(normalizedDirection, stretchLength);
  const middleEnd = end.clone().addScaledVector(normalizedDirection, -stretchLength);

  const leftStretch = createSpanSegment(start, middleStart, span.stretchWidth, stretchMaterial.clone(), span.segmentsRadius, 2);
  const coil = createSpanSegment(middleStart, middleEnd, span.coilWidth, coilMaterial, span.segmentsRadius, 2);
  const rightStretch = createSpanSegment(middleEnd, end, span.stretchWidth, stretchMaterial, span.segmentsRadius, 2);

  if (leftStretch) {
    group.add(leftStretch);
  }
  if (coil) {
    group.add(coil);
  }
  if (rightStretch) {
    group.add(rightStretch);
  }

  return group;
}

export function createSpanMesh(span: RenderSpan, context: RenderAssetContext) {
  switch (span.kind) {
    case 'line':
      return createLineSpan(span);
    case 'cylinder':
      return createCylinderSpan(span, context);
    case 'spring':
      return createSpringSpan(span, context);
    default:
      return null;
  }
}
