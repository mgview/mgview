import { useEffect, useRef, useState } from 'react';
import { Box, MousePointer2, Move3D, Plus, Rotate3D, Trash2, X } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

import { evaluateScene } from '../core/sceneEvaluation.ts';
import type { SceneAssetRoot } from '../api/sceneAssetUrl.ts';
import type { MaterialDefinition, NormalizedSceneConfig, SceneVisual, TimelineFrame, VisualType } from '../core/types.ts';
import { VISUAL_TYPE_OPTIONS } from './editorShared.tsx';
import { createLegacyAxes } from '../rendering/axisHelpers.ts';
import {
  deriveCameraOverride,
  sceneUpVector,
  toCanonicalCamera,
  toCanonicalCameraFromOverride,
  type CameraOverride,
} from '../rendering/coordinateConvention.ts';
import { pickRenderEntity } from '../rendering/raycastSelection.ts';
import { RenderGraphManager } from '../rendering/renderGraph.ts';
import { getRenderEntityRef } from '../rendering/renderNodeTypes.ts';
import { customizeTranslationGizmo } from '../rendering/transformControlsCustomization.ts';
import {
  isVisualResizeSupported,
  resizeVisualFromScale,
  type VisualResizePatch,
} from '../rendering/visualResize.ts';
import {
  createVisualTransformGestureCoordinator,
  type VisualTransformValue,
} from '../rendering/visualTransformGesture.ts';
import { cn } from '../lib/utils.ts';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';
import MaterialPicker from './MaterialPicker.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu.tsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip.tsx';

const DEFAULT_BACKGROUND_COLOR = '#e0f0ff';
/** Ignore selection when the primary pointer moves farther than this (camera orbit counts as drag). */
const RENDERER_POINTER_DRAG_THRESHOLD_PX = 5;

type ViewportTool = 'select' | 'move' | 'rotate' | 'resize';
type TransformSpace = 'local' | 'world';
type TransformPointer = { x: number; y: number; button: number };
type MgTransformControls = Omit<
  TransformControls,
  'pointerHover' | 'pointerDown' | 'pointerMove' | 'pointerUp'
> & {
  pointerHover(pointer: TransformPointer): void;
  pointerDown(pointer: TransformPointer): void;
  pointerMove(pointer: TransformPointer): void;
  pointerUp(pointer: TransformPointer): void;
};

function buildCameraSeedKey(
  scenePath: string,
  cameraParentFrame: string,
  cameraEye: [number, number, number],
  cameraFocus: [number, number, number],
  cameraUp: [number, number, number]
) {
  return JSON.stringify({
    scenePath,
    cameraParentFrame,
    cameraEye,
    cameraFocus,
    cameraUp,
  });
}

function getRendererBackgroundColor(color: string | undefined) {
  try {
    return new THREE.Color(color || DEFAULT_BACKGROUND_COLOR);
  } catch {
    return new THREE.Color(DEFAULT_BACKGROUND_COLOR);
  }
}

interface RendererPanelProps {
  cameraSeedKey: string;
  layoutSizeKey?: string;
  onCameraCommit?: (camera: {
    cameraParentFrame: string;
    cameraEye: [number, number, number];
    cameraFocus: [number, number, number];
    cameraUp: [number, number, number];
  }) => void;
  onCameraPreviewChange?: (camera: {
    cameraParentFrame: string;
    cameraEye: [number, number, number];
    cameraFocus: [number, number, number];
    cameraUp: [number, number, number];
  }) => void;
  scenePath: string;
  sceneAssetRoot: SceneAssetRoot;
  scene: NormalizedSceneConfig;
  frame: TimelineFrame | undefined;
  selectedObjectName: string | null;
  selectedVisualName: string | null;
  selectedSpanName?: string | null;
  selectedSpanVisualName?: string | null;
  onSelectObject?: (objectName: string, visualName: string | null) => void;
  onSelectSpan?: (spanName: string, visualName: string | null) => void;
  onClearSelection?: () => void;
  onCreateVisual?: (objectName: string, type: VisualType) => boolean;
  onDeleteSelectedVisual?: () => boolean;
  onRenameVisual?: (currentName: string, nextName: string) => boolean;
  onOpenSceneEditorRail?: () => void;
  onVisualTransformChange?: (transform: VisualTransformValue) => void;
  onVisualTransformPreviewChange?: (transform: VisualTransformValue) => void;
  onVisualResizeChange?: (patch: VisualResizePatch) => void;
  onVisualResizePreviewChange?: (patch: VisualResizePatch) => void;
  onVisualMaterialChange?: (material: MaterialDefinition) => void;
  onVisualMaterialPreviewChange?: (material: MaterialDefinition) => void;
  showPerformanceOverlay?: boolean;
  onHidePerformanceOverlay?: () => void;
  sceneObjectOptions: Array<{ name: string; type: string }>;
}

interface SceneHandle {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  transformControls: MgTransformControls;
  cameraLight: THREE.PointLight;
  sceneLight: THREE.PointLight;
  worldAxes: THREE.Group;
  sceneRoot: THREE.Group;
  renderGraph: RenderGraphManager;
  raycaster: THREE.Raycaster;
  resizeObserver: ResizeObserver;
  resize: () => void;
  frameId: number | null;
  cameraChangeFrameId: number | null;
}

interface PerformanceOverlayStats {
  fps: number;
  frameTimeMs: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  pixelRatio: number;
}

function formatOverlayNumber(value: number) {
  return Number.isFinite(value) ? value.toLocaleString() : '0';
}

export default function RendererPanel({
  cameraSeedKey,
  layoutSizeKey,
  onCameraCommit,
  onCameraPreviewChange,
  scenePath,
  sceneAssetRoot,
  scene,
  frame,
  selectedObjectName,
  selectedVisualName,
  selectedSpanName = null,
  selectedSpanVisualName = null,
  onSelectObject,
  onSelectSpan,
  onClearSelection,
  onCreateVisual,
  onDeleteSelectedVisual,
  onRenameVisual,
  onOpenSceneEditorRail,
  onVisualTransformChange,
  onVisualTransformPreviewChange,
  onVisualResizeChange,
  onVisualResizePreviewChange,
  onVisualMaterialChange,
  onVisualMaterialPreviewChange,
  showPerformanceOverlay = false,
  onHidePerformanceOverlay,
  sceneObjectOptions,
}: RendererPanelProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<SceneHandle | null>(null);
  const cameraDirtyRef = useRef(false);
  const cameraSeedKeyRef = useRef<string | null>(null);
  const cameraOverrideRef = useRef<CameraOverride | null>(null);
  const latestSceneRef = useRef(scene);
  const latestFrameRef = useRef(frame);
  const isApplyingCameraRef = useRef(false);
  const latestCameraCommitRef = useRef(onCameraCommit);
  const latestCameraPreviewChangeRef = useRef(onCameraPreviewChange);
  const latestVisualTransformChangeRef = useRef(onVisualTransformChange);
  const latestVisualTransformPreviewChangeRef = useRef(onVisualTransformPreviewChange);
  const latestVisualResizeChangeRef = useRef(onVisualResizeChange);
  const latestVisualResizePreviewChangeRef = useRef(onVisualResizePreviewChange);
  const lastEmittedCameraSeedKeyRef = useRef<string | null>(null);
  const gizmoPointerGestureRef = useRef(false);
  const showPerformanceOverlayRef = useRef(showPerformanceOverlay);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const performanceSampleRef = useRef<{
    lastFrameTimestamp: number | null;
    sampleStartedAt: number | null;
    sampleFrameCount: number;
  }>({
    lastFrameTimestamp: null,
    sampleStartedAt: null,
    sampleFrameCount: 0,
  });
  const [performanceStats, setPerformanceStats] = useState<PerformanceOverlayStats | null>(null);
  const [viewportTool, setViewportTool] = useState<ViewportTool>('select');
  const [transformSpace, setTransformSpace] = useState<TransformSpace>('local');
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [lastAttachObjectName, setLastAttachObjectName] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    objectName: string;
    visualName: string;
  } | null>(null);
  const [contextVisualName, setContextVisualName] = useState('');
  const selectedVisualType =
    selectedObjectName && selectedVisualName
      ? scene.objects[selectedObjectName]?.visual?.[selectedVisualName]?.type ?? null
      : null;
  const resizeSupported = isVisualResizeSupported(selectedVisualType);
  const rememberedAttachObjectName = sceneObjectOptions.some(
    ({ name }) => name === lastAttachObjectName
  )
    ? lastAttachObjectName
    : null;
  const addParentObjectName = rememberedAttachObjectName ?? selectedObjectName ?? '';
  const contextVisual = contextMenu
    ? scene.objects[contextMenu.objectName]?.visual?.[contextMenu.visualName]
    : undefined;

  latestCameraCommitRef.current = onCameraCommit;
  latestCameraPreviewChangeRef.current = onCameraPreviewChange;
  latestVisualTransformChangeRef.current = onVisualTransformChange;
  latestVisualTransformPreviewChangeRef.current = onVisualTransformPreviewChange;
  latestVisualResizeChangeRef.current = onVisualResizeChange;
  latestVisualResizePreviewChangeRef.current = onVisualResizePreviewChange;
  showPerformanceOverlayRef.current = showPerformanceOverlay;

  const toCameraState = (override: CameraOverride) => ({
    cameraParentFrame: override.parentFrame,
    cameraEye: [override.localEye.x, override.localEye.y, override.localEye.z] as [number, number, number],
    cameraFocus: [override.localFocus.x, override.localFocus.y, override.localFocus.z] as [number, number, number],
    cameraUp: [override.localUp.x, override.localUp.y, override.localUp.z] as [number, number, number],
  });

  const emitCameraPreviewChange = (override: CameraOverride) => {
    latestCameraPreviewChangeRef.current?.(toCameraState(override));
  };

  const emitCameraCommit = (override: CameraOverride) => {
    const callback = latestCameraCommitRef.current;
    if (!callback) {
      return;
    }

    const nextCameraState = toCameraState(override);
    lastEmittedCameraSeedKeyRef.current = buildCameraSeedKey(
      scenePath,
      nextCameraState.cameraParentFrame,
      nextCameraState.cameraEye,
      nextCameraState.cameraFocus,
      nextCameraState.cameraUp
    );

    callback({
      cameraParentFrame: nextCameraState.cameraParentFrame,
      cameraEye: nextCameraState.cameraEye,
      cameraFocus: nextCameraState.cameraFocus,
      cameraUp: nextCameraState.cameraUp,
    });
  };

  latestSceneRef.current = scene;
  latestFrameRef.current = frame;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const world = new THREE.Scene();
    world.background = getRendererBackgroundColor(scene.backgroundColor);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.addEventListener('start', () => {
      cameraDirtyRef.current = true;
      const currentScene = latestSceneRef.current;
      const currentFrame = latestFrameRef.current;
      const currentEvaluation = evaluateScene(currentScene, currentFrame);
      cameraOverrideRef.current = deriveCameraOverride(currentScene, currentEvaluation, camera, controls);
    });
    controls.addEventListener('end', () => {
      if (cameraOverrideRef.current) {
        emitCameraCommit(cameraOverrideRef.current);
      }
    });
    controls.addEventListener('change', () => {
      if (!cameraDirtyRef.current || isApplyingCameraRef.current === true) {
        return;
      }

      const currentScene = latestSceneRef.current;
      const currentFrame = latestFrameRef.current;
      const currentEvaluation = evaluateScene(currentScene, currentFrame);
      cameraOverrideRef.current = deriveCameraOverride(currentScene, currentEvaluation, camera, controls);
      const currentHandle = handleRef.current;
      if (currentHandle?.cameraChangeFrameId != null) {
        cancelAnimationFrame(currentHandle.cameraChangeFrameId);
      }
      handleRef.current!.cameraChangeFrameId = requestAnimationFrame(() => {
        handleRef.current!.cameraChangeFrameId = null;
        if (cameraOverrideRef.current) {
          emitCameraPreviewChange(cameraOverrideRef.current);
        }
      });
    });

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const hemisphereLight = new THREE.HemisphereLight(0xeaf4ff, 0x4a5568, 1.15);
    const cameraLight = new THREE.PointLight(0xffffff, 1.2, 0);
    cameraLight.position.set(-1, 1, 1);
    camera.add(cameraLight);
    const fillLight = new THREE.PointLight(0xdfe8ff, 0.65, 0);
    fillLight.position.set(1.5, 0.2, -1.25);
    camera.add(fillLight);
    const sceneLight = new THREE.PointLight(0xffffff, 1.7, 0);
    world.add(ambientLight, hemisphereLight, sceneLight, camera);

    const worldAxes = createLegacyAxes(
      Math.max(scene.workspaceSize, 0.1),
      Math.max(scene.workspaceSize / 100, 0.001)
    );
    const sceneRoot = new THREE.Group();
    const renderGraph = new RenderGraphManager(sceneRoot, scenePath, sceneAssetRoot);
    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.disconnect();
    customizeTranslationGizmo(transformControls);
    transformControls.setSize(0.8);
    const transformHelper = transformControls.getHelper();
    world.add(transformHelper);
    const transformGesture = createVisualTransformGestureCoordinator({
      onCommit: (transform) => latestVisualTransformChangeRef.current?.(transform),
      onPreview: (transform) => latestVisualTransformPreviewChangeRef.current?.(transform),
    });
    const resizeGesture = createVisualTransformGestureCoordinator<VisualResizePatch>({
      onCommit: (patch) => latestVisualResizeChangeRef.current?.(patch),
      onPreview: (patch) => latestVisualResizePreviewChangeRef.current?.(patch),
    });
    let resizeStartVisual: SceneVisual | null = null;

    transformControls.addEventListener('mouseDown', () => {
      gizmoPointerGestureRef.current = true;
      transformGesture.begin();
      resizeGesture.begin();
      const entityRef = getRenderEntityRef(transformControls.object);
      resizeStartVisual =
        transformControls.mode === 'scale' && entityRef?.kind === 'visual'
          ? structuredClone(
              latestSceneRef.current.objects[entityRef.objectName]?.visual?.[entityRef.visualName] ?? null
            )
          : null;
      controls.enabled = false;
    });
    transformControls.addEventListener('objectChange', () => {
      const target = transformControls.object;
      if (!target) {
        return;
      }

      if (transformControls.mode === 'scale') {
        const patch = resizeStartVisual
          ? resizeVisualFromScale(resizeStartVisual, target.scale)
          : null;
        target.scale.set(1, 1, 1);
        if (patch) {
          resizeGesture.change(patch);
        }
        return;
      }

      const transform: VisualTransformValue = {
        position: { x: target.position.x, y: target.position.y, z: target.position.z },
        rotation: { x: target.rotation.x, y: target.rotation.y, z: target.rotation.z },
      };
      transformGesture.change(transform);
    });
    transformControls.addEventListener('mouseUp', () => {
      controls.enabled = true;
      transformGesture.end();
      resizeGesture.end();
      resizeStartVisual = null;
    });
    const raycaster = new THREE.Raycaster();
    raycaster.params.Line.threshold = 0.08;
    world.add(worldAxes, sceneRoot);

    const resize = () => {
      const width = host.clientWidth || 1;
      const height = host.clientHeight || 1;
      renderer.setPixelRatio(window.devicePixelRatio);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    const tick = () => {
      const now = performance.now();
      const perfState = performanceSampleRef.current;
      if (perfState.lastFrameTimestamp === null) {
        perfState.lastFrameTimestamp = now;
        perfState.sampleStartedAt = now;
        perfState.sampleFrameCount = 0;
      }

      perfState.sampleFrameCount += 1;
      const frameTimeMs = now - perfState.lastFrameTimestamp;
      perfState.lastFrameTimestamp = now;

      controls.update();
      renderer.render(world, camera);

      if (showPerformanceOverlayRef.current && perfState.sampleStartedAt !== null) {
        const sampleElapsedMs = now - perfState.sampleStartedAt;
        if (sampleElapsedMs >= 250) {
          setPerformanceStats({
            fps: perfState.sampleFrameCount / (sampleElapsedMs / 1000),
            frameTimeMs,
            drawCalls: renderer.info.render.calls,
            triangles: renderer.info.render.triangles,
            geometries: renderer.info.memory.geometries,
            textures: renderer.info.memory.textures,
            pixelRatio: renderer.getPixelRatio(),
          });
          perfState.sampleStartedAt = now;
          perfState.sampleFrameCount = 0;
        }
      } else {
        perfState.sampleStartedAt = now;
        perfState.sampleFrameCount = 0;
      }

      handleRef.current!.frameId = requestAnimationFrame(tick);
    };

    handleRef.current = {
      scene: world,
      camera,
      renderer,
      controls,
      transformControls: transformControls as MgTransformControls,
      cameraLight,
      sceneLight,
      worldAxes,
      sceneRoot,
      renderGraph,
      raycaster,
      resizeObserver,
      resize,
      frameId: requestAnimationFrame(tick),
      cameraChangeFrameId: null,
    };

    return () => {
      const handle = handleRef.current;
      if (!handle) {
        return;
      }

      if (handle.frameId !== null) {
        cancelAnimationFrame(handle.frameId);
      }
      if (handle.cameraChangeFrameId !== null) {
        cancelAnimationFrame(handle.cameraChangeFrameId);
      }
      handle.resizeObserver.disconnect();
      handle.controls.dispose();
      handle.transformControls.dispose();
      handle.renderer.dispose();
      handle.renderGraph.dispose();
      handle.renderer.domElement.remove();
      handleRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!showPerformanceOverlay) {
      setPerformanceStats(null);
    }
  }, [showPerformanceOverlay]);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (!contextMenuRef.current?.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setContextMenu(null);
      }
    };

    window.addEventListener('pointerdown', handleOutsidePointerDown);
    window.addEventListener('keydown', handleEscape, true);
    return () => {
      window.removeEventListener('pointerdown', handleOutsidePointerDown);
      window.removeEventListener('keydown', handleEscape, true);
    };
  }, [contextMenu]);

  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) {
      return;
    }

    // Grid and viewport changes can settle across multiple frames, so we resize
    // once immediately and again on the next two frames to catch the final box.
    handle.resize();
    const frameOne = requestAnimationFrame(() => {
      handle.resize();
    });
    const frameTwo = requestAnimationFrame(() => {
      handle.resize();
    });

    return () => {
      cancelAnimationFrame(frameOne);
      cancelAnimationFrame(frameTwo);
    };
  }, [layoutSizeKey]);

  useEffect(() => {
    const handleResize = () => {
      handleRef.current?.resize();
    };

    window.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) {
      return;
    }

    const evaluation = evaluateScene(scene, frame);
    const canonicalCamera = toCanonicalCamera(scene, evaluation);
    const seedChanged = cameraSeedKeyRef.current !== cameraSeedKey;
    const matchesRendererUpdate = lastEmittedCameraSeedKeyRef.current === cameraSeedKey;
    const shouldResetCamera = seedChanged && !matchesRendererUpdate;

    handle.scene.background = getRendererBackgroundColor(scene.backgroundColor);
    const lightPosition = sceneUpVector(scene)
      .multiplyScalar(Math.max(scene.workspaceSize, 1))
      .applyQuaternion(canonicalCamera.sceneToCanonical);
    handle.sceneLight.position.copy(lightPosition);

    if (shouldResetCamera) {
      cameraSeedKeyRef.current = cameraSeedKey;
      cameraDirtyRef.current = false;
      cameraOverrideRef.current = null;
      lastEmittedCameraSeedKeyRef.current = null;
    } else if (seedChanged) {
      cameraSeedKeyRef.current = cameraSeedKey;
    }

    const activeCamera =
      cameraDirtyRef.current && cameraOverrideRef.current
        ? toCanonicalCameraFromOverride(scene, evaluation, cameraOverrideRef.current)
        : canonicalCamera;

    handle.sceneRoot.quaternion.copy(activeCamera.sceneToCanonical);
    handle.worldAxes.quaternion.copy(activeCamera.sceneToCanonical);
    handle.worldAxes.visible = scene.showAxes;

    if (!cameraDirtyRef.current || !cameraOverrideRef.current) {
      isApplyingCameraRef.current = true;
      handle.camera.up.copy(canonicalCamera.worldUp);
      handle.camera.position.copy(canonicalCamera.worldEye);
      handle.controls.target.copy(canonicalCamera.worldFocus);
      handle.controls.update();
      isApplyingCameraRef.current = false;
    } else {
      const overrideCamera = toCanonicalCameraFromOverride(scene, evaluation, cameraOverrideRef.current);
      isApplyingCameraRef.current = true;
      handle.camera.up.copy(overrideCamera.worldUp);
      handle.camera.position.copy(overrideCamera.worldEye);
      handle.controls.target.copy(overrideCamera.worldFocus);
      handle.controls.update();
      isApplyingCameraRef.current = false;
    }
  }, [cameraSeedKey, frame, scene]);

  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) {
      return;
    }

    handle.renderGraph.setScenePath(scenePath, sceneAssetRoot);
    handle.renderGraph.update(evaluateScene(scene, frame), {
      objectName: selectedObjectName,
      visualName: selectedVisualName,
      spanName: selectedSpanName,
      spanVisualName: selectedSpanVisualName,
    });
  }, [frame, scene, sceneAssetRoot, scenePath, selectedObjectName, selectedSpanName, selectedSpanVisualName, selectedVisualName]);

  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) {
      return;
    }

    const transformControls = handle.transformControls;
    if (
      viewportTool === 'select' ||
      !selectedObjectName ||
      !selectedVisualName ||
      (viewportTool === 'resize' && !resizeSupported)
    ) {
      transformControls.detach();
      handle.controls.enabled = true;
      return;
    }

    const container = handle.renderGraph.getVisualContainer(selectedObjectName, selectedVisualName);
    if (!container) {
      transformControls.detach();
      handle.controls.enabled = true;
      return;
    }

    transformControls.setMode(
      viewportTool === 'move' ? 'translate' : viewportTool === 'rotate' ? 'rotate' : 'scale'
    );
    transformControls.setSpace(viewportTool === 'resize' ? 'local' : transformSpace);
    transformControls.attach(container);

    return () => {
      transformControls.detach();
      handle.controls.enabled = true;
    };
  }, [resizeSupported, selectedObjectName, selectedVisualName, transformSpace, viewportTool]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const isEditableTarget = (target: EventTarget | null) => {
      const element = target instanceof HTMLElement ? target : null;
      return Boolean(
        element?.isContentEditable ||
          element?.closest('input, textarea, select, button, [contenteditable="true"]')
      );
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const viewportIsActive = host.matches(':hover') || host.contains(document.activeElement);
      if (!viewportIsActive || isEditableTarget(event.target)) {
        return;
      }

      if (event.key === 'Escape') {
        if (viewportTool !== 'select') {
          event.preventDefault();
          setViewportTool('select');
        }
        return;
      }

      if (
        (event.key === 'Delete' || event.key === 'Backspace') &&
        !event.repeat &&
        selectedObjectName &&
        selectedVisualName
      ) {
        event.preventDefault();
        if (onDeleteSelectedVisual?.()) {
          setViewportTool('select');
        }
        return;
      }

      if (event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'm':
          event.preventDefault();
          setViewportTool('move');
          break;
        case 'r':
          event.preventDefault();
          setViewportTool('rotate');
          break;
        case 's':
          if (resizeSupported) {
            event.preventDefault();
            setViewportTool('resize');
          }
          break;
        case 'a':
          event.preventDefault();
          if (selectedObjectName) {
            setLastAttachObjectName(selectedObjectName);
          }
          setAddMenuOpen(true);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDeleteSelectedVisual, resizeSupported, selectedObjectName, selectedVisualName, viewportTool]);

  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) {
      return;
    }

    const canvas = handle.renderer.domElement;
    let primaryPointerDown: { x: number; y: number } | null = null;
    let primaryPointerDragged = false;
    let suppressDoubleClick = false;

    const resetPrimaryPointer = () => {
      primaryPointerDown = null;
      primaryPointerDragged = false;
    };

    const getTransformPointer = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        y: -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
        button: event.button,
      };
    };

    const resolveVisualIdentityAtPointer = (event: MouseEvent) => {
      const entityRef = pickRenderEntity(event, canvas, handle.camera, handle.raycaster, handle.sceneRoot);
      if (entityRef?.kind === 'visual') {
        return { objectName: entityRef.objectName, visualName: entityRef.visualName };
      }
      if (entityRef?.kind === 'object') {
        const visualName = Object.keys(scene.objects[entityRef.objectName]?.visual ?? {})[0];
        return visualName ? { objectName: entityRef.objectName, visualName } : null;
      }
      return null;
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button === 2 && resolveVisualIdentityAtPointer(event)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      if (event.button !== 0) {
        return;
      }

      hostRef.current?.focus({ preventScroll: true });

      if (handle.transformControls.object) {
        const pointer = getTransformPointer(event);
        handle.transformControls.pointerHover(pointer);
        if (handle.transformControls.axis !== null) {
          if (!document.pointerLockElement) {
            canvas.setPointerCapture(event.pointerId);
          }
          handle.transformControls.pointerDown(pointer);
        }
      }

      if (gizmoPointerGestureRef.current) {
        resetPrimaryPointer();
        return;
      }

      primaryPointerDown = { x: event.clientX, y: event.clientY };
      primaryPointerDragged = false;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (handle.transformControls.dragging) {
        // Keep the chosen axis locked for the whole drag. In particular, do not
        // run gizmo hover raycasts as the pointer crosses other handles.
        handle.transformControls.pointerMove(getTransformPointer(event));
        return;
      }

      if (
        handle.transformControls.object &&
        (event.pointerType === 'mouse' || event.pointerType === 'pen')
      ) {
        handle.transformControls.pointerHover(getTransformPointer(event));
      }

      if (!primaryPointerDown || primaryPointerDragged) {
        return;
      }

      const dx = event.clientX - primaryPointerDown.x;
      const dy = event.clientY - primaryPointerDown.y;
      if (dx * dx + dy * dy > RENDERER_POINTER_DRAG_THRESHOLD_PX ** 2) {
        primaryPointerDragged = true;
      }
    };

    const resolveSelectionAtPointer = (event: MouseEvent) => {
      const entityRef = pickRenderEntity(event, canvas, handle.camera, handle.raycaster, handle.sceneRoot);
      if (!entityRef) {
        onClearSelection?.();
        return false;
      }

      switch (entityRef.kind) {
        case 'visual':
          onSelectObject?.(entityRef.objectName, entityRef.visualName);
          return true;
        case 'object':
          onSelectObject?.(entityRef.objectName, Object.keys(scene.objects[entityRef.objectName]?.visual ?? {})[0] ?? null);
          return true;
        case 'span-visual':
          onSelectSpan?.(entityRef.spanName, entityRef.visualName);
          return true;
        case 'span':
          onSelectSpan?.(entityRef.spanName, Object.keys(scene.spans[entityRef.spanName]?.visual ?? {})[0] ?? null);
          return true;
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      if (handle.transformControls.dragging) {
        handle.transformControls.pointerUp(getTransformPointer(event));
      }

      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }

      if (gizmoPointerGestureRef.current) {
        gizmoPointerGestureRef.current = false;
        suppressDoubleClick = true;
        window.setTimeout(() => {
          suppressDoubleClick = false;
        }, 0);
        resetPrimaryPointer();
        return;
      }

      const wasClick = primaryPointerDown !== null && !primaryPointerDragged;
      resetPrimaryPointer();
      if (!wasClick) {
        return;
      }

      resolveSelectionAtPointer(event);
    };

    const handleDoubleClick = (event: MouseEvent) => {
      if (suppressDoubleClick) {
        return;
      }

      if (resolveSelectionAtPointer(event)) {
        onOpenSceneEditorRail?.();
      }
    };

    const handleContextMenu = (event: MouseEvent) => {
      const identity = resolveVisualIdentityAtPointer(event);
      if (!identity) {
        setContextMenu(null);
        return;
      }

      event.preventDefault();
      onSelectObject?.(identity.objectName, identity.visualName);
      const bounds = hostRef.current?.getBoundingClientRect();
      const x = bounds ? Math.max(8, Math.min(event.clientX - bounds.left, bounds.width - 232)) : 8;
      const y = bounds ? Math.max(8, Math.min(event.clientY - bounds.top, bounds.height - 150)) : 8;
      setContextVisualName(identity.visualName);
      setContextMenu({ x, y, ...identity });
    };

    const handlePointerCancel = (event: PointerEvent) => {
      if (handle.transformControls.dragging) {
        handle.transformControls.pointerUp(getTransformPointer(event));
      }
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      gizmoPointerGestureRef.current = false;
      resetPrimaryPointer();
    };

    canvas.addEventListener('pointerdown', handlePointerDown, true);
    canvas.addEventListener('pointermove', handlePointerMove, true);
    canvas.addEventListener('pointerup', handlePointerUp, true);
    canvas.addEventListener('pointercancel', handlePointerCancel, true);
    canvas.addEventListener('dblclick', handleDoubleClick);
    canvas.addEventListener('contextmenu', handleContextMenu);
    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown, true);
      canvas.removeEventListener('pointermove', handlePointerMove, true);
      canvas.removeEventListener('pointerup', handlePointerUp, true);
      canvas.removeEventListener('pointercancel', handlePointerCancel, true);
      canvas.removeEventListener('dblclick', handleDoubleClick);
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [onClearSelection, onOpenSceneEditorRail, onSelectObject, onSelectSpan, scene]);

  const commitContextRename = () => {
    if (!contextMenu || contextVisualName === contextMenu.visualName) {
      return;
    }

    if (onRenameVisual?.(contextMenu.visualName, contextVisualName)) {
      setContextMenu((current) =>
        current ? { ...current, visualName: contextVisualName.trim() } : current
      );
      return;
    }

    setContextVisualName(contextMenu.visualName);
  };

  return (
    <section className="flex min-h-0 h-full rounded-md border border-border bg-card p-1.5">
      <div
        className="renderer-surface outline-none focus-visible:ring-2 focus-visible:ring-ring"
        ref={hostRef}
        tabIndex={0}
        aria-label="3D viewport"
      >
        <TooltipProvider delayDuration={250}>
          <div
            className="absolute left-2.5 top-2.5 z-[3] flex items-center gap-1 rounded-md border border-border bg-popover/90 p-1 shadow-lg backdrop-blur-sm"
            role="toolbar"
            aria-label="Viewport tools"
          >
            {(
              [
                ['select', 'Select', MousePointer2, 'Select (Esc)'],
                ['move', 'Move', Move3D, 'Move (M)'],
                ['rotate', 'Rotate', Rotate3D, 'Rotate (R)'],
                [
                  'resize',
                  'Resize',
                  Box,
                  resizeSupported ? 'Resize (S)' : 'Resize is unavailable for this visual type',
                ],
              ] as const
            ).map(([tool, label, Icon, tooltip]) => (
              <Tooltip key={tool}>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-7 w-7',
                        viewportTool === tool && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                      )}
                      aria-label={label}
                      aria-pressed={viewportTool === tool}
                      disabled={tool === 'resize' && !resizeSupported}
                      onClick={() => setViewportTool(tool)}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">{tooltip}</TooltipContent>
              </Tooltip>
            ))}

            <DropdownMenu
              open={addMenuOpen}
              onOpenChange={(open) => {
                if (open && selectedObjectName) {
                  setLastAttachObjectName(selectedObjectName);
                }
                setAddMenuOpen(open);
              }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label="Add geometry"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">Add geometry (A)</TooltipContent>
              </Tooltip>
              <DropdownMenuContent
                align="start"
                side="bottom"
                className="w-52"
                onCloseAutoFocus={(event) => event.preventDefault()}
              >
                <DropdownMenuLabel>Attach to</DropdownMenuLabel>
                <div className="px-2 pb-1.5">
                  <select
                    className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                    value={addParentObjectName}
                    onChange={(event) => setLastAttachObjectName(event.target.value || null)}
                    onKeyDown={(event) => event.stopPropagation()}
                    aria-label="Geometry parent object"
                  >
                    <option value="" disabled>
                      Choose an object…
                    </option>
                    {sceneObjectOptions.map(({ name, type }) => (
                      <option key={name} value={name}>
                        {name} ({type})
                      </option>
                    ))}
                  </select>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Geometry type</DropdownMenuLabel>
                {VISUAL_TYPE_OPTIONS.map((type) => (
                  <DropdownMenuItem
                    key={type}
                    disabled={!addParentObjectName}
                    onSelect={() => {
                      if (addParentObjectName && onCreateVisual?.(addParentObjectName, type)) {
                        setLastAttachObjectName(addParentObjectName);
                        setViewportTool('select');
                      }
                    }}
                  >
                    <span className="capitalize">{type}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label="Delete selected geometry"
                    disabled={!selectedObjectName || !selectedVisualName}
                    onClick={() => {
                      if (onDeleteSelectedVisual?.()) {
                        setViewportTool('select');
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">Delete geometry (Delete / Backspace)</TooltipContent>
            </Tooltip>

            {viewportTool === 'move' || viewportTool === 'rotate' ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 border-l border-border px-2 text-[0.65rem] uppercase tracking-wide"
                onClick={() => setTransformSpace((current) => (current === 'local' ? 'world' : 'local'))}
                aria-label={`Transform space: ${transformSpace}`}
              >
                {transformSpace}
              </Button>
            ) : null}
          </div>
        </TooltipProvider>
        {contextMenu && contextVisual ? (
          <div
            ref={contextMenuRef}
            className="absolute z-[5] grid w-56 gap-2 rounded-md border border-border bg-popover/95 p-2.5 text-popover-foreground shadow-xl backdrop-blur-sm"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            role="dialog"
            aria-label="Geometry properties"
            onPointerDown={(event) => event.stopPropagation()}
            onContextMenu={(event) => event.preventDefault()}
          >
            <div className="truncate text-[0.66rem] font-semibold uppercase tracking-wide text-muted-foreground">
              {contextMenu.objectName}
            </div>
            <label className="grid gap-1">
              <span className="text-[0.68rem] font-medium text-muted-foreground">Name</span>
              <Input
                className="h-7 text-xs"
                value={contextVisualName}
                onChange={(event) => setContextVisualName(event.target.value)}
                onBlur={commitContextRename}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.currentTarget.blur();
                  }
                }}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-[0.68rem] font-medium text-muted-foreground">Material</span>
              <MaterialPicker
                compact
                material={contextVisual.material}
                sceneAssetRoot={sceneAssetRoot}
                scenePath={scenePath}
                onMaterialChange={(material) => onVisualMaterialChange?.(material)}
                onMaterialPreviewChange={(material) => onVisualMaterialPreviewChange?.(material)}
              />
            </label>
          </div>
        ) : null}
        {showPerformanceOverlay && performanceStats ? (
          <div
            className="pointer-events-none absolute right-2.5 top-2.5 z-[2] min-w-[168px] rounded-md border border-border bg-popover/90 p-2 shadow-lg backdrop-blur-sm"
            aria-live="off"
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-[0.66rem] font-bold uppercase tracking-wider text-muted-foreground">
                Renderer
              </span>
              {onHidePerformanceOverlay ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="pointer-events-auto h-5 w-5 shrink-0 opacity-70 hover:opacity-100"
                  onClick={(event) => {
                    event.stopPropagation();
                    onHidePerformanceOverlay();
                  }}
                  aria-label="Hide renderer stats overlay"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
            <div className="grid grid-cols-[auto_auto] items-baseline gap-x-3 gap-y-0.5">
              <span className="text-[0.7rem] text-muted-foreground">FPS</span>
              <strong className="justify-self-end font-mono text-[0.72rem]">{formatOverlayNumber(Math.round(performanceStats.fps))}</strong>
              <span className="text-[0.7rem] text-muted-foreground">Frame</span>
              <strong className="justify-self-end font-mono text-[0.72rem]">{performanceStats.frameTimeMs.toFixed(1)} ms</strong>
              <span className="text-[0.7rem] text-muted-foreground">Draw Calls</span>
              <strong className="justify-self-end font-mono text-[0.72rem]">{formatOverlayNumber(performanceStats.drawCalls)}</strong>
              <span className="text-[0.7rem] text-muted-foreground">Triangles</span>
              <strong className="justify-self-end font-mono text-[0.72rem]">{formatOverlayNumber(performanceStats.triangles)}</strong>
              <span className="text-[0.7rem] text-muted-foreground">Geometries</span>
              <strong className="justify-self-end font-mono text-[0.72rem]">{formatOverlayNumber(performanceStats.geometries)}</strong>
              <span className="text-[0.7rem] text-muted-foreground">Textures</span>
              <strong className="justify-self-end font-mono text-[0.72rem]">{formatOverlayNumber(performanceStats.textures)}</strong>
              <span className="text-[0.7rem] text-muted-foreground">Pixel Ratio</span>
              <strong className="justify-self-end font-mono text-[0.72rem]">{performanceStats.pixelRatio.toFixed(2)}</strong>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
