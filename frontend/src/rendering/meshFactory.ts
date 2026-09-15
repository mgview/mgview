import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import optimerRegular from 'three/examples/fonts/optimer_regular.typeface.json' with { type: 'json' };

import type { RenderMaterial, RenderSpan, RenderVisual, RgbaColor } from '../core/types.ts';
import {
  LEGACY_COLOR_PRESETS,
  LEGACY_TEXTURE_PRESETS,
  normalizeMaterialName,
  parseCssColorString,
} from '../core/materialPresets.ts';
import { createBasis } from './axisHelpers.ts';
import { loadCachedAsset } from './assetCache.ts';
import { toThreeVector } from './coordinateConvention.ts';
import { disposeMaterial } from './renderResources.ts';

export interface RenderAssetContext {
  highlightSelection?: boolean;
  resolveSceneAssetUrl: (assetPath: string) => string;
}

interface DisposableAsyncContainer extends THREE.Group {
  userData: THREE.Group['userData'] & {
    disposeAsyncContents?: () => void;
    disposed?: boolean;
  };
}

const objLoader = new OBJLoader();
const stlLoader = new STLLoader();
const textureLoader = new THREE.TextureLoader();
const optimerFont = new FontLoader().parse(optimerRegular);

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
    return new THREE.Color(parsed.hex);
  }

  const normalized = normalizeMaterialName(materialName);
  const presetColor = LEGACY_COLOR_PRESETS[normalized] ?? LEGACY_TEXTURE_PRESETS[normalized]?.color;
  return new THREE.Color(presetColor ?? '#b8c7df');
}

function colorFromValue(color: RgbaColor | string): THREE.Color {
  return typeof color === 'string' ? colorFromName(color) : colorFromRgba(color);
}

function colorFromMaterial(material: RenderMaterial): THREE.Color {
  return material.color ? colorFromValue(material.color) : colorFromName(material.name);
}

function getOpacity(material: RenderMaterial): number {
  if (typeof material.opacity === 'number') {
    return THREE.MathUtils.clamp(material.opacity, 0, 1);
  }

  const parsed = parseCssColorString(material.name);
  if (typeof parsed?.alpha === 'number') {
    return parsed.alpha;
  }

  const alpha = typeof material.color === 'object' ? material.color.a : parseCssColorString(material.color)?.alpha;
  return typeof alpha === 'number' ? alpha : 1;
}

function getMaterialKey(material: RenderMaterial): string {
  return normalizeMaterialName(material.preset ?? material.name);
}

function loadTexture(url: string): Promise<THREE.Texture> {
  return loadCachedAsset(textureCache, url, () =>
    new Promise<THREE.Texture>((resolve, reject) => {
      textureLoader.load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          resolve(texture);
        },
        undefined,
        reject
      );
    })
  );
}

function createMaterial(visualMaterial: RenderMaterial, context: RenderAssetContext): THREE.MeshPhongMaterial {
  const materialKey = getMaterialKey(visualMaterial);
  const texturePreset = LEGACY_TEXTURE_PRESETS[materialKey];
  const texturePath = visualMaterial.texture?.path ?? texturePreset?.path;
  const repeat = visualMaterial.texture?.repeat ?? texturePreset?.repeat ?? [1, 1];
  const opacity = getOpacity(visualMaterial);
  const sourceColor = visualMaterial.color ? colorFromValue(visualMaterial.color) : colorFromName(visualMaterial.name);
  const colorMix = THREE.MathUtils.clamp(visualMaterial.colorMix ?? (texturePath ? 0 : 1), 0, 1);
  const color = texturePath
    ? new THREE.Color('#ffffff').lerp(sourceColor, colorMix)
    : sourceColor;

  const material = new THREE.MeshPhongMaterial({
    color,
    specular: new THREE.Color(materialKey.startsWith('SHINY_') ? '#ffffff' : '#7f8da3'),
    shininess: visualMaterial.shininess ?? (texturePreset?.metalness ? 60 : materialKey.startsWith('SHINY_') ? 70 : 30),
    opacity,
    transparent: opacity < 1,
    side: opacity < 1 ? THREE.DoubleSide : THREE.FrontSide,
    depthWrite: opacity >= 1,
  });

  if (texturePath) {
    void loadTexture(context.resolveSceneAssetUrl(texturePath))
      .then((sourceTexture) => {
        if (material.userData.disposed) {
          return;
        }
        const texture = sourceTexture.clone();
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeat[0], repeat[1]);
        const offset = visualMaterial.texture?.offset;
        if (offset) {
          texture.offset.set(offset[0], offset[1]);
        }
        texture.rotation = visualMaterial.texture?.rotation ?? 0;
        texture.needsUpdate = true;
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
  clone.map = material.map?.clone() ?? null;
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

const TEXT_CANVAS_FONT_SIZE = 96;
const TEXT_CANVAS_PADDING = 24;
const TEXT_CANVAS_HEIGHT = 160;

export function measureTextGlyphHeight(
  context: CanvasRenderingContext2D,
  text: string,
  fontSize = TEXT_CANVAS_FONT_SIZE
): number {
  context.font = `${fontSize}px Optimer, Georgia, serif`;
  const metrics = context.measureText(text || ' ');
  const ascent = metrics.actualBoundingBoxAscent;
  const descent = metrics.actualBoundingBoxDescent;
  if (
    Number.isFinite(ascent) &&
    Number.isFinite(descent) &&
    (ascent > 0 || descent > 0)
  ) {
    return ascent + descent;
  }

  return fontSize;
}

export function computeText2dPlaneSize(
  canvasWidth: number,
  canvasHeight: number,
  glyphHeight: number,
  scale: number
): { width: number; height: number } {
  const safeGlyphHeight = Math.max(glyphHeight, 1e-6);
  const planeHeight = scale * (canvasHeight / safeGlyphHeight);
  return {
    width: planeHeight * (canvasWidth / canvasHeight),
    height: planeHeight,
  };
}

function createTextCanvas(text: string, color: string) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  context.font = `${TEXT_CANVAS_FONT_SIZE}px Optimer, Georgia, serif`;
  const metrics = context.measureText(text || ' ');
  const width = Math.max(64, Math.ceil(metrics.width + TEXT_CANVAS_PADDING * 2));
  const height = TEXT_CANVAS_HEIGHT;
  const glyphHeight = measureTextGlyphHeight(context, text, TEXT_CANVAS_FONT_SIZE);

  canvas.width = width;
  canvas.height = height;

  const draw = canvas.getContext('2d');
  if (!draw) {
    return null;
  }

  draw.font = `${TEXT_CANVAS_FONT_SIZE}px Optimer, Georgia, serif`;
  draw.textAlign = 'center';
  draw.textBaseline = 'middle';
  draw.fillStyle = color;
  draw.strokeStyle = 'rgba(255,255,255,0.2)';
  draw.lineWidth = 4;
  draw.strokeText(text || ' ', width / 2, height / 2);
  draw.fillText(text || ' ', width / 2, height / 2);

  return { canvas, glyphHeight };
}

function createTextVisual2d(visual: Extract<RenderVisual, { type: 'text' }>, highlightSelection: boolean | undefined) {
  const text = visual.text.trim();
  if (text === '') {
    return null;
  }

  const selectionColor = new THREE.Color('#2e7dd7');
  const color = highlightSelection
    ? '#2e7dd7'
    : `#${colorFromMaterial(visual.material).getHexString()}`;
  const textCanvas = createTextCanvas(visual.text, color);
  if (!textCanvas) {
    return null;
  }

  const { canvas, glyphHeight } = textCanvas;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const planeSize = computeText2dPlaneSize(canvas.width, canvas.height, glyphHeight, visual.scale);
  const geometry = new THREE.PlaneGeometry(planeSize.width, planeSize.height);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    opacity: highlightSelection ? 1 : getOpacity(visual.material),
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  return new THREE.Mesh(geometry, material);
}

function centerGeometryAtOrigin(geometry: THREE.BufferGeometry) {
  geometry.computeBoundingBox();
  const boundingBox = geometry.boundingBox;
  if (!boundingBox) {
    return;
  }

  const center = new THREE.Vector3();
  boundingBox.getCenter(center);
  geometry.translate(-center.x, -center.y, -center.z);
}

function createTextVisual3d(
  visual: Extract<RenderVisual, { type: 'text' }>,
  material: THREE.MeshPhongMaterial
) {
  const text = visual.text.trim();
  if (text === '') {
    return null;
  }

  const size = 1;
  const geometry = new TextGeometry(text, {
    font: optimerFont,
    size,
    depth: 0.1 * size,
    curveSegments: 2,
    bevelEnabled: true,
    bevelThickness: 0.02 * size,
    bevelSize: 0.05 * size,
  });
  centerGeometryAtOrigin(geometry);

  const mesh = finalizeMesh(new THREE.Mesh(geometry, material));
  mesh.scale.setScalar(visual.scale);
  return mesh;
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
  return loadCachedAsset(objCache, url, () =>
    new Promise<THREE.Group>((resolve, reject) => {
      objLoader.load(url, resolve, undefined, reject);
    })
  );
}

function loadStl(url: string): Promise<THREE.BufferGeometry> {
  return loadCachedAsset(stlCache, url, () =>
    new Promise<THREE.BufferGeometry>((resolve, reject) => {
      stlLoader.load(url, resolve, undefined, reject);
    })
  );
}

function buildMeshVisual(visual: Extract<RenderVisual, { type: 'mesh' }>, context: RenderAssetContext) {
  const assetUrl = context.resolveSceneAssetUrl(visual.path);
  const material = createMaterial(visual.material, context);
  const container: DisposableAsyncContainer = new THREE.Group();

  container.userData.kind = 'mesh-container';
  container.userData.disposed = false;
  container.userData.disposeAsyncContents = () => {
    container.userData.disposed = true;
    disposeMaterial(material);
  };
  if (context.highlightSelection) {
    applySelectionHighlight(material);
  }

  const extension = visual.path.split('.').pop()?.toLowerCase();
  if (extension === 'obj') {
    void loadObj(assetUrl)
      .then((template) => {
        if (container.userData.disposed) {
          return;
        }
        const object = template.clone(true);
        object.scale.setScalar(visual.scale);
        applyMaterialToObject(object, material);
        container.add(object);
      })
      .catch(() => {
        disposeMaterial(material);
      });
    return container;
  }

  if (extension === 'stl') {
    void loadStl(assetUrl)
      .then((geometry) => {
        if (container.userData.disposed) {
          return;
        }
        const mesh = new THREE.Mesh(geometry.clone(), material);
        mesh.scale.setScalar(visual.scale);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        container.add(mesh);
      })
      .catch(() => {
        disposeMaterial(material);
      });
    return container;
  }

  disposeMaterial(material);
  return null;
}

export function createVisualMesh(visual: RenderVisual, context: RenderAssetContext) {
  if (visual.type === 'mesh') {
    return buildMeshVisual(visual, context);
  }

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
      disposeMaterial(material);
      return createGridVisual(visual, context.highlightSelection);
    case 'text':
      if (visual.textMode === '2d') {
        disposeMaterial(material);
        return createTextVisual2d(visual, context.highlightSelection);
      }
      {
        const mesh = createTextVisual3d(visual, material);
        if (!mesh) {
          disposeMaterial(material);
        }
        return mesh;
      }
    case 'basis':
      disposeMaterial(material);
      return createBasis(visual.scale);
    default:
      disposeMaterial(material);
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

function createLineSpan(span: Extract<RenderSpan, { kind: 'line' }>, highlightSelection: boolean | undefined) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    toThreeVector(span.start),
    toThreeVector(span.end),
  ]);
  const color = highlightSelection ? new THREE.Color('#2e7dd7') : colorFromMaterial(span.material);
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
      return createLineSpan(span, context.highlightSelection);
    case 'cylinder':
      return createCylinderSpan(span, context);
    case 'spring':
      return createSpringSpan(span, context);
    default:
      return null;
  }
}
