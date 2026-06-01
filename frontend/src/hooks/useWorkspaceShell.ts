import { useEffect, useMemo, useState } from 'react';
import { canPersistScenesToServer } from '../api/runtimeMode.ts';
import { getApiRoot, getSceneDirectory } from '../core/sceneRef.ts';
import type { NormalizedSceneConfig } from '../core/types.ts';
import type { LoadedSceneData } from './useSceneWorkspace.ts';
import { getDirectoryPath } from './useSceneWorkspace.ts';

const PERFORMANCE_OVERLAY_STORAGE_KEY = 'mgview.performanceOverlayOpen';

function tupleApproximatelyEqual(
  left: [number, number, number] | undefined,
  right: [number, number, number],
  epsilon = 1e-6
) {
  return (
    left !== undefined &&
    Math.abs(left[0] - right[0]) <= epsilon &&
    Math.abs(left[1] - right[1]) <= epsilon &&
    Math.abs(left[2] - right[2]) <= epsilon
  );
}

function getFileName(filePath: string): string {
  const normalizedPath = filePath.replace(/\\/g, '/');
  return normalizedPath.split('/').pop() ?? normalizedPath;
}

function combineBrowserPath(currentFolder: string | null | undefined, path: string): string {
  const trimmedPath = path.trim();
  if (!trimmedPath) {
    return trimmedPath;
  }

  return currentFolder && currentFolder !== '.'
    ? `${currentFolder.replace(/\/+$/g, '')}/${trimmedPath}`
    : trimmedPath;
}

function readStoredPerformanceOverlayPreference() {
  try {
    return window.localStorage.getItem(PERFORMANCE_OVERLAY_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export type CameraDraftPreview = {
  cameraParentFrame: string;
  cameraEye: [number, number, number];
  cameraFocus: [number, number, number];
  cameraUp: [number, number, number];
};

export type SceneOverlayMode = 'load' | 'create' | 'saveAs';

interface UseWorkspaceShellOptions {
  activeScene: NormalizedSceneConfig | null;
  browserPath: string | null | undefined;
  handleBrowse: (path: string, root?: 'workspace' | 'sample') => Promise<void>;
  handleCreateScene: (path: string) => Promise<boolean>;
  handleLoadWorkspacePath: (path: string, options?: { actionLabel?: string }) => Promise<boolean>;
  handleLoadSample: (path: string, options?: { actionLabel?: string }) => Promise<boolean>;
  handleSaveSceneAs: (path: string) => Promise<boolean>;
  loaded: LoadedSceneData | null;
  sceneInput: string;
  setError: (message: string | null) => void;
  setSceneInput: (value: string) => void;
  updateDraftScene: (updater: (scene: NormalizedSceneConfig) => void) => void;
  updateDraftScenePreview: (updater: (scene: NormalizedSceneConfig) => void) => void;
}

export function useWorkspaceShell({
  activeScene,
  browserPath,
  handleBrowse,
  handleCreateScene,
  handleLoadWorkspacePath,
  handleLoadSample,
  handleSaveSceneAs,
  loaded,
  sceneInput,
  setError,
  setSceneInput,
  updateDraftScene,
  updateDraftScenePreview,
}: UseWorkspaceShellOptions) {
  const [loadOverlayOpen, setLoadOverlayOpen] = useState(false);
  const [samplesOverlayOpen, setSamplesOverlayOpen] = useState(false);
  const [sceneOverlayMode, setSceneOverlayMode] = useState<SceneOverlayMode>('load');
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [performanceOverlayOpen, setPerformanceOverlayOpen] = useState(readStoredPerformanceOverlayPreference);
  const [simulationOverlayOpen, setSimulationOverlayOpen] = useState(false);
  const [simulationEntryInput, setSimulationEntryInput] = useState('');
  const [leftRailCollapsed, setLeftRailCollapsed] = useState(false);
  const [cameraPreview, setCameraPreview] = useState<CameraDraftPreview | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(PERFORMANCE_OVERLAY_STORAGE_KEY, String(performanceOverlayOpen));
    } catch {
      // Ignore storage failures so the toggle still works in restricted contexts.
    }
  }, [performanceOverlayOpen]);

  useEffect(() => {
    if (!activeScene || !cameraPreview) {
      return;
    }

    const parentMatches = activeScene.cameraParentFrame === cameraPreview.cameraParentFrame;
    const eyeMatches = tupleApproximatelyEqual(activeScene.cameraEye, cameraPreview.cameraEye);
    const focusMatches = tupleApproximatelyEqual(activeScene.cameraFocus, cameraPreview.cameraFocus);
    const upMatches = tupleApproximatelyEqual(activeScene.cameraUp, cameraPreview.cameraUp);

    if (parentMatches && eyeMatches && focusMatches && upMatches) {
      setCameraPreview(null);
    }
  }, [activeScene, cameraPreview]);

  const cameraSeedKey = useMemo(() => {
    if (!activeScene || !loaded) {
      return 'no-scene';
    }

    return JSON.stringify({
      scenePath: loaded.scenePath,
      cameraParentFrame: activeScene.cameraParentFrame,
      cameraUp: activeScene.cameraUp ?? null,
      cameraEye: activeScene.cameraEye ?? null,
      cameraFocus: activeScene.cameraFocus ?? null,
    });
  }, [
    activeScene?.cameraEye,
    activeScene?.cameraFocus,
    activeScene?.cameraParentFrame,
    activeScene?.cameraUp,
    loaded,
  ]);

  const openLoadOverlay = () => {
    setError(null);
    setSceneOverlayMode('load');
    setLoadOverlayOpen(true);
    void handleBrowse('.');
  };

  const openSamplesOverlay = () => {
    setError(null);
    setSamplesOverlayOpen(true);
  };

  const openCreateOverlay = () => {
    if (!canPersistScenesToServer) {
      return;
    }

    setError(null);
    setSceneOverlayMode('create');
    setSceneInput('new_scene.json');
    setLoadOverlayOpen(true);
    void handleBrowse('.');
  };

  const openSaveAsOverlay = () => {
    if (!canPersistScenesToServer) {
      return;
    }

    if (!loaded) {
      setError('Load a scene before using Save As.');
      return;
    }

    setError(null);
    setSceneOverlayMode('saveAs');
    setSceneInput(getFileName(loaded.sceneRef.path));
    setLoadOverlayOpen(true);

    const browsePath =
      loaded.sceneRef.source === 'workspace' ? getDirectoryPath(loaded.sceneRef.path) : '.';
    void handleBrowse(browsePath, 'workspace');
  };

  const openSimulationOverlay = () => {
    setSimulationOverlayOpen(true);
    if (loaded) {
      void handleBrowse(getSceneDirectory(loaded.sceneRef), getApiRoot(loaded.sceneRef));
    }
  };

  const handleOpenSelectedScene = async () => {
    const didLoad = await handleLoadWorkspacePath(sceneInput, {
      actionLabel: 'Loading a scene by path',
    });
    if (didLoad) {
      setLoadOverlayOpen(false);
    }
    return didLoad;
  };

  const handleOpenScenePath = async (path: string) => {
    const didLoad = await handleLoadWorkspacePath(path, {
      actionLabel: 'Loading a scene by path',
    });
    if (didLoad) {
      setLoadOverlayOpen(false);
    }
    return didLoad;
  };

  const handleOpenSamplePath = async (path: string) => {
    const didLoad = await handleLoadSample(path, {
      actionLabel: 'Loading a sample scene',
    });
    if (didLoad) {
      setSamplesOverlayOpen(false);
    }
    return didLoad;
  };

  const handleCreateScenePath = async (path: string) => {
    const didCreate = await handleCreateScene(combineBrowserPath(browserPath, path));
    if (didCreate) {
      setLoadOverlayOpen(false);
    }
    return didCreate;
  };

  const handleSaveScenePath = async (path: string) => {
    const didSave = await handleSaveSceneAs(combineBrowserPath(browserPath, path));
    if (didSave) {
      setLoadOverlayOpen(false);
    }
    return didSave;
  };

  const updateSceneVector = (
    key: 'cameraUp' | 'cameraEye' | 'cameraFocus',
    index: 0 | 1 | 2,
    nextValue: number,
    fallback: [number, number, number]
  ) => {
    setCameraPreview(null);
    updateDraftScene((scene) => {
      const current = scene[key] ?? fallback;
      const nextTuple: [number, number, number] = [...current] as [number, number, number];
      nextTuple[index] = nextValue;
      scene[key] = nextTuple;
    });
  };

  const updateSceneVectorPreview = (
    key: 'cameraUp' | 'cameraEye' | 'cameraFocus',
    index: 0 | 1 | 2,
    nextValue: number,
    fallback: [number, number, number]
  ) => {
    setCameraPreview(null);
    updateDraftScenePreview((scene) => {
      const current = scene[key] ?? fallback;
      const nextTuple: [number, number, number] = [...current] as [number, number, number];
      nextTuple[index] = nextValue;
      scene[key] = nextTuple;
    });
  };

  const commitCameraPreview = ({
    cameraParentFrame,
    cameraEye,
    cameraFocus,
    cameraUp,
  }: CameraDraftPreview) => {
    setCameraPreview({
      cameraParentFrame,
      cameraEye,
      cameraFocus,
      cameraUp,
    });
    updateDraftScene((scene) => {
      if (
        scene.cameraParentFrame === cameraParentFrame &&
        tupleApproximatelyEqual(scene.cameraEye, cameraEye) &&
        tupleApproximatelyEqual(scene.cameraFocus, cameraFocus) &&
        tupleApproximatelyEqual(scene.cameraUp, cameraUp)
      ) {
        return;
      }

      scene.cameraParentFrame = cameraParentFrame;
      scene.cameraEye = cameraEye;
      scene.cameraFocus = cameraFocus;
      scene.cameraUp = cameraUp;
    });
  };

  const addSimulationEntry = () => {
    const trimmedEntry = simulationEntryInput.trim();
    if (trimmedEntry.length === 0) {
      return;
    }

    updateDraftScene((scene) => {
      if (!scene.simulationData.includes(trimmedEntry)) {
        scene.simulationData.push(trimmedEntry);
      }
    });
    setSimulationEntryInput('');
  };

  const addSimulationEntries = (entries: string[]) => {
    const trimmedEntries = entries.map((entry) => entry.trim()).filter((entry) => entry.length > 0);
    if (trimmedEntries.length === 0) {
      return;
    }

    updateDraftScene((scene) => {
      for (const entry of trimmedEntries) {
        if (!scene.simulationData.includes(entry)) {
          scene.simulationData.push(entry);
        }
      }
    });
    setSimulationEntryInput('');
  };

  const removeSimulationEntry = (entry: string) => {
    updateDraftScene((scene) => {
      scene.simulationData = scene.simulationData.filter((value) => value !== entry);
    });
  };

  return {
    addSimulationEntries,
    addSimulationEntry,
    cameraPreview,
    cameraSeedKey,
    closeDiagnostics: () => setDiagnosticsOpen(false),
    closeLoadOverlay: () => setLoadOverlayOpen(false),
    closeSamplesOverlay: () => setSamplesOverlayOpen(false),
    closeSimulationOverlay: () => setSimulationOverlayOpen(false),
    commitCameraPreview,
    diagnosticsOpen,
    handleCreateScenePath,
    handleOpenScenePath,
    handleOpenSamplePath,
    handleOpenSelectedScene,
    handleSaveScenePath,
    leftRailCollapsed,
    loadOverlayOpen,
    openCreateOverlay,
    openDiagnostics: () => setDiagnosticsOpen(true),
    openLoadOverlay,
    openSamplesOverlay,
    openSaveAsOverlay,
    openSimulationOverlay,
    samplesOverlayOpen,
    sceneOverlayMode,
    setCameraPreview,
    setLeftRailCollapsed,
    setPerformanceOverlayOpen,
    setSimulationEntryInput,
    simulationEntryInput,
    simulationOverlayOpen,
    performanceOverlayOpen,
    updateSceneVector,
    updateSceneVectorPreview,
    removeSimulationEntry,
  };
}
