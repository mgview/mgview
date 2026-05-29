import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { evaluateScene } from '../core/sceneEvaluation.ts';
import type { NormalizedSceneConfig, TimelineFrame } from '../core/types.ts';
import { createLegacyAxes } from '../rendering/axisHelpers.ts';
import {
  deriveCameraOverride,
  sceneUpVector,
  toCanonicalCamera,
  toCanonicalCameraFromOverride,
  type CameraOverride,
} from '../rendering/coordinateConvention.ts';
import { buildRenderableScene } from '../rendering/sceneGraph.ts';

const DEFAULT_BACKGROUND_COLOR = '#e0f0ff';

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
  scene: NormalizedSceneConfig;
  frame: TimelineFrame | undefined;
  selectedObjectName: string | null;
}

interface SceneHandle {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  cameraLight: THREE.PointLight;
  sceneLight: THREE.PointLight;
  worldAxes: THREE.Group;
  sceneRoot: THREE.Group;
  resizeObserver: ResizeObserver;
  resize: () => void;
  frameId: number | null;
  cameraChangeFrameId: number | null;
}

export default function RendererPanel({
  cameraSeedKey,
  layoutSizeKey,
  onCameraCommit,
  onCameraPreviewChange,
  scenePath,
  scene,
  frame,
  selectedObjectName,
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
  const lastEmittedCameraSeedKeyRef = useRef<string | null>(null);

  latestCameraCommitRef.current = onCameraCommit;
  latestCameraPreviewChangeRef.current = onCameraPreviewChange;

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
      if (handleRef.current?.cameraChangeFrameId !== null) {
        cancelAnimationFrame(handleRef.current.cameraChangeFrameId);
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
      controls.update();
      renderer.render(world, camera);
      handleRef.current!.frameId = requestAnimationFrame(tick);
    };

    handleRef.current = {
      scene: world,
      camera,
      renderer,
      controls,
      cameraLight,
      sceneLight,
      worldAxes,
      sceneRoot,
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
      handle.renderer.dispose();
      handle.sceneRoot.clear();
      handle.renderer.domElement.remove();
      handleRef.current = null;
    };
  }, []);

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

    handle.sceneRoot.clear();
    handle.sceneRoot.add(buildRenderableScene(evaluateScene(scene, frame), selectedObjectName, scenePath));
  }, [frame, scene, scenePath, selectedObjectName]);

  return (
    <section className="panel renderer-panel">
      <div className="renderer-surface" ref={hostRef} />
    </section>
  );
}
