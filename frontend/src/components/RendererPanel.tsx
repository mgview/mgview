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

function getRendererBackgroundColor(color: string | undefined) {
  try {
    return new THREE.Color(color || DEFAULT_BACKGROUND_COLOR);
  } catch {
    return new THREE.Color(DEFAULT_BACKGROUND_COLOR);
  }
}

interface RendererPanelProps {
  cameraSeedKey: string;
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
  grid: THREE.GridHelper;
  sceneRoot: THREE.Group;
  resizeObserver: ResizeObserver;
  frameId: number | null;
}

export default function RendererPanel({
  cameraSeedKey,
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
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.addEventListener('start', () => {
      cameraDirtyRef.current = true;
    });
    controls.addEventListener('change', () => {
      if (!cameraDirtyRef.current || isApplyingCameraRef.current === true) {
        return;
      }

      const currentScene = latestSceneRef.current;
      const currentFrame = latestFrameRef.current;
      const currentEvaluation = evaluateScene(currentScene, currentFrame);
      cameraOverrideRef.current = deriveCameraOverride(currentScene, currentEvaluation, camera, controls);
    });

    const ambientLight = new THREE.AmbientLight(0x222222);
    const cameraLight = new THREE.PointLight(0xffffff, 0.9, 0);
    cameraLight.position.set(-1, 1, 1);
    camera.add(cameraLight);
    const fillLight = new THREE.PointLight(0xffffff, 0.35, 0);
    fillLight.position.set(1, -0.5, -1);
    camera.add(fillLight);
    const sceneLight = new THREE.PointLight(0xffffff, 1.2, 0);
    world.add(ambientLight, sceneLight, camera);

    const grid = new THREE.GridHelper(Math.max(scene.workspaceSize * 6, 1), 12, 0x36506f, 0x223347);
    const worldAxes = createLegacyAxes(
      Math.max(scene.workspaceSize, 0.1),
      Math.max(scene.workspaceSize / 100, 0.001)
    );
    const sceneRoot = new THREE.Group();
    world.add(grid, worldAxes, sceneRoot);

    const resize = () => {
      const width = host.clientWidth || 1;
      const height = host.clientHeight || 1;
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
      grid,
      sceneRoot,
      resizeObserver,
      frameId: requestAnimationFrame(tick),
    };

    return () => {
      const handle = handleRef.current;
      if (!handle) {
        return;
      }

      if (handle.frameId !== null) {
        cancelAnimationFrame(handle.frameId);
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

    const evaluation = evaluateScene(scene, frame);
    const canonicalCamera = toCanonicalCamera(scene, evaluation);
    const shouldResetCamera = cameraSeedKeyRef.current !== cameraSeedKey;

    handle.scene.background = getRendererBackgroundColor(scene.backgroundColor);
    const lightPosition = sceneUpVector(scene)
      .multiplyScalar(Math.max(scene.workspaceSize, 1))
      .applyQuaternion(canonicalCamera.sceneToCanonical);
    handle.sceneLight.position.copy(lightPosition);

    if (shouldResetCamera) {
      cameraSeedKeyRef.current = cameraSeedKey;
      cameraDirtyRef.current = false;
      cameraOverrideRef.current = null;
    }

    const activeCamera =
      cameraDirtyRef.current && cameraOverrideRef.current
        ? toCanonicalCameraFromOverride(scene, evaluation, cameraOverrideRef.current)
        : canonicalCamera;

    handle.sceneRoot.quaternion.copy(activeCamera.sceneToCanonical);
    handle.worldAxes.quaternion.copy(activeCamera.sceneToCanonical);
    handle.worldAxes.visible = scene.showAxes;
    handle.grid.visible = true;

    if (!cameraDirtyRef.current) {
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
    <section className="panel span-12">
      <div className="panel-header">
        <div>
          <h2>Renderer</h2>
          <p className="panel-subtitle">
            First modern `three` slice. It renders live scene geometry from the normalized model and current timeline frame.
          </p>
        </div>
      </div>
      <div className="renderer-surface" ref={hostRef} />
    </section>
  );
}
