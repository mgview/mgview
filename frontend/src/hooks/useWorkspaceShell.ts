import { useEffect, useMemo, useState } from 'react';
import { canPersistScenesToServer } from '../api/runtimeMode.ts';
import { getBasePath } from '../core/pathUtils.ts';
import type { NormalizedSceneConfig } from '../core/types.ts';
import type { LoadedSceneData } from './useSceneWorkspace.ts';
import { getDirectoryPath } from './useSceneWorkspace.ts';

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
  handleBrowse: (path: string) => Promise<void>;
  handleCreateScene: (path: string) => Promise<boolean>;
  handleLoad: (path: string, options?: { actionLabel?: string }) => Promise<boolean>;
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
  handleLoad,
  handleSaveSceneAs,
  loaded,
  sceneInput,
  setError,
  setSceneInput,
  updateDraftScene,
  updateDraftScenePreview,
}: UseWorkspaceShellOptions) {
  const [loadOverlayOpen, setLoadOverlayOpen] = useState(false);
  const [sceneOverlayMode, setSceneOverlayMode] = useState<SceneOverlayMode>('load');
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [simulationOverlayOpen, setSimulationOverlayOpen] = useState(false);
  const [simulationEntryInput, setSimulationEntryInput] = useState('');
  const [leftRailCollapsed, setLeftRailCollapsed] = useState(false);
  const [sampleBrowserExpanded, setSampleBrowserExpanded] = useState(false);
  const [cameraPreview, setCameraPreview] = useState<CameraDraftPreview | null>(null);

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
    void handleBrowse(loaded ? getDirectoryPath(loaded.scenePath) : getDirectoryPath(sceneInput));
  };

  const openCreateOverlay = () => {
    if (!canPersistScenesToServer) {
      return;
    }

    setError(null);
    setSceneOverlayMode('create');
    const defaultDirectory = loaded ? getBasePath(loaded.scenePath).replace(/\/$/, '') : getDirectoryPath(sceneInput);
    setSceneInput('new_scene.json');
    setLoadOverlayOpen(true);
    void handleBrowse(defaultDirectory || '.');
  };

  const openSaveAsOverlay = () => {
    if (!canPersistScenesToServer || !loaded) {
      return;
    }

    setError(null);
    setSceneOverlayMode('saveAs');
    setSceneInput(getFileName(loaded.scenePath));
    setLoadOverlayOpen(true);
    void handleBrowse(getDirectoryPath(loaded.scenePath));
  };

  const openSimulationOverlay = () => {
    setSimulationOverlayOpen(true);
    if (loaded) {
      void handleBrowse(getBasePath(loaded.scenePath));
    }
  };

  const handleOpenSelectedScene = async () => {
    const didLoad = await handleLoad(sceneInput, {
      actionLabel: 'Loading a scene by path',
    });
    if (didLoad) {
      setLoadOverlayOpen(false);
    }
    return didLoad;
  };

  const handleOpenScenePath = async (path: string) => {
    const didLoad = await handleLoad(path, {
      actionLabel: 'Loading a scene by path',
    });
    if (didLoad) {
      setLoadOverlayOpen(false);
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
    closeSimulationOverlay: () => setSimulationOverlayOpen(false),
    commitCameraPreview,
    diagnosticsOpen,
    handleCreateScenePath,
    handleOpenScenePath,
    handleOpenSelectedScene,
    handleSaveScenePath,
    leftRailCollapsed,
    loadOverlayOpen,
    openCreateOverlay,
    openDiagnostics: () => setDiagnosticsOpen(true),
    openLoadOverlay,
    openSaveAsOverlay,
    openSimulationOverlay,
    sampleBrowserExpanded,
    sceneOverlayMode,
    setCameraPreview,
    setLeftRailCollapsed,
    setSampleBrowserExpanded,
    setSimulationEntryInput,
    simulationEntryInput,
    simulationOverlayOpen,
    updateSceneVector,
    updateSceneVectorPreview,
    removeSimulationEntry,
  };
}
