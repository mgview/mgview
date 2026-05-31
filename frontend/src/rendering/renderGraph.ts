import * as THREE from 'three';

import type { SceneEvaluation } from '../core/sceneEvaluation.ts';
import type { RenderSpan, RenderVisual } from '../core/types.ts';
import { getBasePath, normalizePathSeparators } from '../core/pathUtils.ts';
import { resolveBundledAssetUrl, resolvePublicAssetUrl } from '../api/localFiles.ts';
import { createSpanMesh, createVisualMesh } from './meshFactory.ts';
import { setRenderEntityRef } from './renderNodeTypes.ts';
import { applyMatrix } from './renderTransforms.ts';
import { toThreeVector } from './coordinateConvention.ts';

interface RenderAssetContext {
  resolveSceneAssetUrl: (assetPath: string) => string;
}

interface VisualNodeState {
  container: THREE.Group;
  content: THREE.Object3D | null;
  signature: string | null;
}

interface ObjectNodeState {
  group: THREE.Group;
  visuals: Map<string, VisualNodeState>;
}

interface SpanNodeState {
  group: THREE.Group;
  content: THREE.Object3D | null;
  signature: string | null;
}

interface RenderSelectionState {
  objectName: string | null;
  spanName: string | null;
}

function createRenderAssetContext(scenePath: string): RenderAssetContext {
  const sceneBasePath = getBasePath(scenePath);
  return {
    resolveSceneAssetUrl(assetPath: string) {
      const normalizedAssetPath = normalizePathSeparators(assetPath).replace(/^\/+/, '');
      if (normalizedAssetPath.startsWith('assets/')) {
        return resolveBundledAssetUrl(normalizedAssetPath);
      }

      const baseUrl = resolvePublicAssetUrl(normalizePathSeparators(sceneBasePath));
      return new URL(normalizedAssetPath, baseUrl).toString();
    },
  };
}

function disposeMaterial(material: THREE.Material) {
  if ('map' in material && material.map instanceof THREE.Texture && material.map instanceof THREE.CanvasTexture) {
    material.map.dispose();
  }
  material.dispose();
}

export function disposeObject3D(root: THREE.Object3D) {
  root.traverse((child) => {
    const asyncDispose = child.userData?.disposeAsyncContents;
    if (typeof asyncDispose === 'function') {
      asyncDispose();
    }

    if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.LineSegments) {
      child.geometry?.dispose();

      if (Array.isArray(child.material)) {
        for (const material of child.material) {
          disposeMaterial(material);
        }
      } else if (child.material) {
        disposeMaterial(child.material);
      }
    }
  });
}

function clearGroup(group: THREE.Group) {
  for (const child of [...group.children]) {
    disposeObject3D(child);
    group.remove(child);
  }
}

function replaceGroupContent(group: THREE.Group, nextContent: THREE.Object3D | null) {
  clearGroup(group);
  if (nextContent) {
    group.add(nextContent);
  }
}

function createVisualSignature(visual: RenderVisual, isSelected: boolean) {
  const { position, rotation, visible, ...staticVisual } = visual;
  return JSON.stringify({
    ...staticVisual,
    isSelected,
  });
}

function createSpanSignature(span: RenderSpan, isSelected: boolean) {
  const { visible, ...staticSpan } = span;
  return JSON.stringify({
    ...staticSpan,
    isSelected,
  });
}

function getSpanIdentity(span: RenderSpan) {
  return {
    spanName: span.spanName,
    visualName: span.visualName,
  };
}

export class RenderGraphManager {
  private readonly root: THREE.Group;

  private scenePath: string;

  private assetContext: RenderAssetContext;

  private readonly objectNodes = new Map<string, ObjectNodeState>();

  private readonly spanNodes = new Map<string, SpanNodeState>();

  constructor(root: THREE.Group, scenePath: string) {
    this.root = root;
    this.scenePath = scenePath;
    this.assetContext = createRenderAssetContext(scenePath);
  }

  setScenePath(scenePath: string) {
    if (scenePath === this.scenePath) {
      return;
    }

    this.scenePath = scenePath;
    this.assetContext = createRenderAssetContext(scenePath);
    for (const objectState of this.objectNodes.values()) {
      for (const visualState of objectState.visuals.values()) {
        visualState.signature = null;
      }
    }
    for (const spanState of this.spanNodes.values()) {
      spanState.signature = null;
    }
  }

  update(evaluation: SceneEvaluation, selection: RenderSelectionState) {
    this.reconcileObjects(evaluation, selection.objectName);
    this.reconcileSpans(evaluation, selection.spanName);
  }

  dispose() {
    clearGroup(this.root);
    this.objectNodes.clear();
    this.spanNodes.clear();
  }

  private reconcileObjects(evaluation: SceneEvaluation, selectedObjectName: string | null) {
    const activeNames = new Set<string>();

    for (const [objectName, snapshot] of Object.entries(evaluation.objects)) {
      activeNames.add(objectName);
      let objectState = this.objectNodes.get(objectName);
      if (!objectState) {
        const group = new THREE.Group();
        setRenderEntityRef(group, { kind: 'object', objectName });
        this.root.add(group);
        objectState = {
          group,
          visuals: new Map<string, VisualNodeState>(),
        };
        this.objectNodes.set(objectName, objectState);
      }

      objectState.group.position.copy(toThreeVector(snapshot.position));
      applyMatrix(objectState.group, snapshot.rotationMatrix);

      const activeVisualNames = new Set<string>();
      for (const visual of snapshot.visuals) {
        activeVisualNames.add(visual.name);
        let visualState = objectState.visuals.get(visual.name);
        if (!visualState) {
          const container = new THREE.Group();
          setRenderEntityRef(container, { kind: 'visual', objectName, visualName: visual.name });
          objectState.group.add(container);
          visualState = {
            container,
            content: null,
            signature: null,
          };
          objectState.visuals.set(visual.name, visualState);
        }

        visualState.container.position.copy(toThreeVector(visual.position));
        visualState.container.rotation.set(visual.rotation.x, visual.rotation.y, visual.rotation.z);
        visualState.container.visible = visual.visible;

        const nextSignature = createVisualSignature(visual, objectName === selectedObjectName);
        if (visualState.signature !== nextSignature) {
          const nextContent = createVisualMesh(visual, {
            ...this.assetContext,
            highlightSelection: objectName === selectedObjectName,
          });
          replaceGroupContent(visualState.container, nextContent);
          visualState.content = nextContent;
          visualState.signature = nextSignature;
        }
      }

      for (const [visualName, visualState] of objectState.visuals) {
        if (activeVisualNames.has(visualName)) {
          continue;
        }

        clearGroup(visualState.container);
        objectState.group.remove(visualState.container);
        objectState.visuals.delete(visualName);
      }

      objectState.group.visible = objectState.group.children.length > 0;
    }

    for (const [objectName, objectState] of this.objectNodes) {
      if (activeNames.has(objectName)) {
        continue;
      }

      clearGroup(objectState.group);
      this.root.remove(objectState.group);
      this.objectNodes.delete(objectName);
    }
  }

  private reconcileSpans(evaluation: SceneEvaluation, selectedSpanName: string | null) {
    const activeNames = new Set<string>();

    for (const span of evaluation.spans) {
      const key = `${span.spanName}::${span.visualName}`;
      activeNames.add(key);
      let spanState = this.spanNodes.get(key);
      if (!spanState) {
        const group = new THREE.Group();
        setRenderEntityRef(group, { kind: 'span-visual', ...getSpanIdentity(span) });
        this.root.add(group);
        spanState = {
          group,
          content: null,
          signature: null,
        };
        this.spanNodes.set(key, spanState);
      }

      spanState.group.visible = span.visible;
      const nextSignature = createSpanSignature(span, span.spanName === selectedSpanName);
      if (spanState.signature !== nextSignature) {
        const nextContent = createSpanMesh(span, {
          ...this.assetContext,
          highlightSelection: span.spanName === selectedSpanName,
        });
        replaceGroupContent(spanState.group, nextContent);
        spanState.content = nextContent;
        spanState.signature = nextSignature;
      }
    }

    for (const [key, spanState] of this.spanNodes) {
      if (activeNames.has(key)) {
        continue;
      }

      clearGroup(spanState.group);
      this.root.remove(spanState.group);
      this.spanNodes.delete(key);
    }
  }
}
