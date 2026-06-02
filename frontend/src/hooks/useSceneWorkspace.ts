import { useEffect, useMemo, useState } from 'react';
import {
  canPersistScenesToServer,
  createSceneJson,
  listLocalFiles,
  loadSceneJson,
  loadTextFile,
  saveSceneJson,
  type FileBrowserListing,
} from '../api/localFiles.ts';
import { expandSimulationFiles } from '../core/expandSimulationFiles.ts';
import { getBasePath } from '../core/pathUtils.ts';
import {
  clearSceneRefFromUrl,
  canOverwriteScene,
  createWorkspaceRef,
  formatSceneRef,
  getApiRoot,
  getSceneBasePath,
  resolveApiFileRequest,
  syncSceneRefToUrl,
  workspacePathFromInput,
  type ApiRoot,
  type SceneRef,
} from '../core/sceneRef.ts';
import { parseSimulationText } from '../core/parseSimulationText.ts';
import { createSceneDocument } from '../core/sceneDocument.ts';
import { buildObjectInspections, collectSceneDiagnostics } from '../core/sceneInspector.ts';
import { inferCanonicalNewtonianFrame, inferCanonicalSceneOrigin } from '../core/simulationChannels.ts';
import { buildTimeline } from '../core/timeline.ts';
import { useUndoRedo } from './useUndoRedo.ts';
import type {
  NormalizedSceneConfig,
  ParsedSimulationFile,
  SceneConfig,
  SceneDiagnostic,
  SceneObjectInspection,
  SimulationTable,
  Timeline,
} from '../core/types.ts';

export interface LoadedSceneData {
  rawScene: SceneConfig;
  sceneRef: SceneRef;
  scenePath: string;
  scene: NormalizedSceneConfig;
  simulationFiles: string[];
  timeline: Timeline;
  channelNames: string[];
  parsedSimulationFiles: ParsedSimulationFile[];
  diagnostics: SceneDiagnostic[];
  objectInspections: SceneObjectInspection[];
  fileErrors: string[];
}

interface SimulationWorkspaceState {
  simulationFiles: string[];
  timeline: Timeline;
  channelNames: string[];
  parsedSimulationFiles: ParsedSimulationFile[];
  fileErrors: string[];
}

interface LoadSceneOptions {
  force?: boolean;
  successMessage?: string;
  actionLabel?: string;
}

export interface WorkspaceNotifications {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

function isValidObjectName(name: string): boolean {
  return name.trim().length > 0;
}

function cloneScene(scene: NormalizedSceneConfig): NormalizedSceneConfig {
  return structuredClone(scene);
}

function sceneSnapshotsEqual(
  left: NormalizedSceneConfig | null,
  right: NormalizedSceneConfig | null
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function getDirectoryPath(filePath: string): string {
  const basePath = getBasePath(filePath).replace(/\/$/, '');
  return basePath || '.';
}

function getFileStem(filePath: string): string {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const fileName = normalizedPath.split('/').pop() ?? normalizedPath;
  return fileName.replace(/\.json$/i, '') || 'new_scene';
}

export function createNewSceneTemplate(scenePath: string): SceneConfig {
  const sceneName = getFileStem(scenePath);
  return {
    name: sceneName,
    simulationData: [],
    showAxes: false,
    workspaceSize: 1,
    cameraParentFrame: 'N',
    cameraUp: [0, 0, 1],
    cameraEye: [3, 3, 3],
    cameraFocus: [0, 0, 0],
    speedFactor: 1,
  };
}

export function createSavableScene(
  rawScene: SceneConfig,
  draftScene: NormalizedSceneConfig
): SceneConfig {
  const nextScene = structuredClone(rawScene);

  nextScene.name = draftScene.name;
  nextScene.simulationData = [...draftScene.simulationData];
  nextScene.layout = structuredClone(draftScene.layout);
  delete nextScene.newtonianFrame;
  delete nextScene.sceneOrigin;
  nextScene.backgroundColor = draftScene.backgroundColor;
  nextScene.showAxes = draftScene.showAxes;
  nextScene.workspaceSize = draftScene.workspaceSize;
  nextScene.cameraParentFrame = draftScene.cameraParentFrame;
  nextScene.cameraUp = draftScene.cameraUp
    ? ([...draftScene.cameraUp] as [number, number, number])
    : undefined;
  nextScene.cameraEye = draftScene.cameraEye
    ? ([...draftScene.cameraEye] as [number, number, number])
    : undefined;
  nextScene.cameraFocus = draftScene.cameraFocus
    ? ([...draftScene.cameraFocus] as [number, number, number])
    : undefined;
  nextScene.speedFactor = draftScene.speedFactor;
  nextScene.plots = structuredClone(draftScene.plots);

  nextScene.objects = {};
  for (const [objectName, draftObject] of Object.entries(draftScene.objects)) {
    if (!isValidObjectName(objectName)) {
      continue;
    }

    const rawObject = rawScene.objects?.[objectName];
    nextScene.objects[objectName] = {
      ...(rawObject ? structuredClone(rawObject) : {}),
      type: draftObject.type,
      rotationFrame: draftObject.rotationFrame,
      visual: draftObject.visual ? structuredClone(draftObject.visual) : undefined,
    };
  }

  if (rawScene.objects) {
    for (const [objectName, rawObject] of Object.entries(rawScene.objects)) {
      if (!isValidObjectName(objectName)) {
        continue;
      }

      if (nextScene.objects[objectName]) {
        continue;
      }

      nextScene.objects[objectName] = structuredClone(rawObject);
    }
  }

  nextScene.spans = Object.fromEntries(
    Object.entries(draftScene.spans).map(([spanName, draftSpan]) => [
      spanName,
      structuredClone(draftSpan),
    ])
  );

  return nextScene;
}

async function loadSceneData(sceneRef: SceneRef): Promise<LoadedSceneData> {
  const rawScene = await loadSceneJson(sceneRef);
  const simulationState = await loadSimulationWorkspaceState(rawScene, sceneRef);
  const channelNames = simulationState.channelNames;
  const scene = createSceneDocument(rawScene, channelNames);
  const diagnostics = collectSceneDiagnostics(
    rawScene,
    scene,
    simulationState.simulationFiles,
    channelNames,
    simulationState.parsedSimulationFiles,
    simulationState.fileErrors
  );
  const objectInspections = buildObjectInspections(rawScene, scene, channelNames);

  return {
    rawScene,
    sceneRef,
    scenePath: formatSceneRef(sceneRef),
    scene,
    simulationFiles: simulationState.simulationFiles,
    timeline: simulationState.timeline,
    channelNames,
    parsedSimulationFiles: simulationState.parsedSimulationFiles,
    diagnostics,
    objectInspections,
    fileErrors: simulationState.fileErrors,
  };
}

async function loadSimulationWorkspaceState(
  scene: SceneConfig,
  sceneRef: SceneRef
): Promise<SimulationWorkspaceState> {
  const basePath = getSceneBasePath(sceneRef);
  const simulationFiles = expandSimulationFiles(scene.simulationData ?? [], basePath);
  const tableResults = await Promise.allSettled(
    simulationFiles.map(async (filePath) => {
      const request = resolveApiFileRequest(filePath);
      return parseSimulationText(
        await loadTextFile(request.path, request.root),
        filePath
      );
    })
  );
  const tables: SimulationTable[] = [];
  const parsedSimulationFiles: ParsedSimulationFile[] = [];
  const fileErrors: string[] = [];

  for (const [index, result] of tableResults.entries()) {
    if (result.status === 'fulfilled') {
      tables.push(result.value);
      parsedSimulationFiles.push({
        filePath: simulationFiles[index],
        channelNames: result.value.channelNames,
        sceneOrigin: inferCanonicalSceneOrigin(result.value.channelNames),
        newtonianFrame: inferCanonicalNewtonianFrame(result.value.channelNames),
      });
      continue;
    }

    const reason = result.reason instanceof Error ? result.reason.message : 'Unknown load error';
    fileErrors.push(`Could not parse simulation file ${simulationFiles[index]}: ${reason}`);
  }

  return {
    simulationFiles,
    timeline: buildTimeline(tables),
    channelNames: [...new Set(tables.flatMap((table) => table.channelNames))],
    parsedSimulationFiles,
    fileErrors,
  };
}

export function useSceneWorkspace(initialSceneRef: SceneRef, notifications?: WorkspaceNotifications) {
  const [sceneInput, setSceneInput] = useState(
    initialSceneRef.source === 'workspace' ? initialSceneRef.path : ''
  );
  const [loaded, setLoaded] = useState<LoadedSceneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [browserListing, setBrowserListing] = useState<FileBrowserListing | null>(null);
  const [browserLoading, setBrowserLoading] = useState(false);
  const [browserError, setBrowserError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedObjectName, setSelectedObjectName] = useState<string | null>(null);
  const [selectedVisualName, setSelectedVisualName] = useState<string | null>(null);
  const [simulationState, setSimulationState] = useState<SimulationWorkspaceState | null>(null);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const {
    snapshot: draftScene,
    set: pushDraftScene,
    replaceCurrent: replaceDraftScene,
    reset: resetDraftScene,
    undo: undoDraftScene,
    redo: redoDraftScene,
    canUndo: canUndoDraftScene,
    canRedo: canRedoDraftScene,
  } = useUndoRedo<NormalizedSceneConfig | null>(null, {
    isEqual: sceneSnapshotsEqual,
  });

  const authoredScene = useMemo(() => {
    if (!loaded) {
      return null;
    }

    return draftScene ? createSavableScene(loaded.rawScene, draftScene) : loaded.rawScene;
  }, [draftScene, loaded]);
  const activeScene = draftScene ?? loaded?.scene ?? null;
  const simulationFiles = simulationState?.simulationFiles ?? loaded?.simulationFiles ?? [];
  const timeline = simulationState?.timeline ?? loaded?.timeline ?? buildTimeline([]);
  const channelNames = simulationState?.channelNames ?? loaded?.channelNames ?? [];
  const parsedSimulationFiles =
    simulationState?.parsedSimulationFiles ?? loaded?.parsedSimulationFiles ?? [];
  const fileErrors = simulationState?.fileErrors ?? loaded?.fileErrors ?? [];
  const diagnostics = useMemo(() => {
    if (!authoredScene || !activeScene) {
      return loaded?.diagnostics ?? [];
    }

    return collectSceneDiagnostics(
      authoredScene,
      activeScene,
      simulationFiles,
      channelNames,
      parsedSimulationFiles,
      fileErrors
    );
  }, [
    activeScene,
    authoredScene,
    channelNames,
    fileErrors,
    loaded?.diagnostics,
    parsedSimulationFiles,
    simulationFiles,
  ]);
  const objectInspections = useMemo(() => {
    if (!authoredScene || !activeScene) {
      return loaded?.objectInspections ?? [];
    }

    return buildObjectInspections(authoredScene, activeScene, channelNames);
  }, [activeScene, authoredScene, channelNames, loaded?.objectInspections]);
  const hasLocalEdits = useMemo(
    () =>
      loaded !== null &&
      draftScene !== null &&
      JSON.stringify(draftScene) !== JSON.stringify(loaded.scene),
    [draftScene, loaded]
  );
  const canSaveScene = useMemo(
    () => canPersistScenesToServer && loaded !== null && canOverwriteScene(loaded.sceneRef),
    [loaded]
  );

  useEffect(() => {
    if (!hasLocalEdits) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasLocalEdits]);

  const showWorkspaceShell = loaded !== null || loading;

  const reportError = (message: string) => {
    setError(message);
    notifications?.showError(message);
  };

  const reportSuccess = (message: string) => {
    notifications?.showSuccess(message);
  };

  const confirmDiscardLocalEdits = (nextSceneLabel: string, actionLabel: string): boolean => {
    if (!loaded || !draftScene || !hasLocalEdits) {
      return true;
    }

    return window.confirm(
      `${actionLabel} will discard unsaved local edits for ${loaded.scenePath}.\n\nContinue to ${nextSceneLabel}?`
    );
  };

  const updateSelectionFromLoadedScene = (nextLoaded: LoadedSceneData) => {
    setSelectedObjectName(nextLoaded.objectInspections[0]?.name ?? null);
    setSelectedVisualName(nextLoaded.objectInspections[0]?.visuals[0]?.name ?? null);
  };

  const clearCurrentScene = () => {
    setLoaded(null);
    setSimulationState(null);
    setSceneInput('');
    resetDraftScene(null);
    setSelectedObjectName(null);
    setSelectedVisualName(null);
    clearSceneRefFromUrl();
  };

  const handleBrowse = async (nextPath: string, root: ApiRoot = 'workspace') => {
    setBrowserLoading(true);
    setBrowserError(null);
    setBrowserListing(null);

    try {
      setBrowserListing(await listLocalFiles(nextPath, root));
    } catch (browseError) {
      setBrowserError(browseError instanceof Error ? browseError.message : 'Unknown browse error');
      setBrowserListing(null);
    } finally {
      setBrowserLoading(false);
    }
  };

  const browseSceneInputDirectory = () => handleBrowse(getDirectoryPath(sceneInput), 'workspace');
  const simulationDataKey = useMemo(() => {
    if (!loaded || !draftScene) {
      return null;
    }

    return `${loaded.scenePath}::${JSON.stringify(draftScene.simulationData)}`;
  }, [draftScene?.simulationData, loaded?.scenePath]);

  const commitLoadedScene = (nextLoaded: LoadedSceneData, successMessage?: string) => {
    setLoaded(nextLoaded);
    setSimulationState({
      simulationFiles: nextLoaded.simulationFiles,
      timeline: nextLoaded.timeline,
      channelNames: nextLoaded.channelNames,
      parsedSimulationFiles: nextLoaded.parsedSimulationFiles,
      fileErrors: nextLoaded.fileErrors,
    });
    setSceneInput(nextLoaded.sceneRef.source === 'workspace' ? nextLoaded.sceneRef.path : '');
    resetDraftScene(cloneScene(nextLoaded.scene));
    updateSelectionFromLoadedScene(nextLoaded);
    syncSceneRefToUrl(nextLoaded.sceneRef);
    if (successMessage) {
      reportSuccess(successMessage);
    }
    void handleBrowse(
      nextLoaded.sceneRef.source === 'workspace' ? getDirectoryPath(nextLoaded.sceneRef.path) : '.',
      getApiRoot(nextLoaded.sceneRef)
    );
  };

  const handleLoad = async (sceneRef: SceneRef, options?: LoadSceneOptions) => {
    const settings = options ?? {};
    if (
      !settings.force &&
      !confirmDiscardLocalEdits(formatSceneRef(sceneRef), settings.actionLabel ?? 'Loading another scene')
    ) {
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const nextLoaded = await loadSceneData(sceneRef);
      commitLoadedScene(nextLoaded, settings.successMessage);
      return true;
    } catch (loadError) {
      reportError(loadError instanceof Error ? loadError.message : 'Unknown load error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleLoadWorkspacePath = async (scenePath: string, options?: LoadSceneOptions) => {
    const workspacePath = workspacePathFromInput(scenePath);
    if (!workspacePath) {
      reportError('Workspace scene paths cannot use samples/, assets/, or parent traversal.');
      return false;
    }

    return handleLoad(createWorkspaceRef(workspacePath), options);
  };

  const confirmWorkspaceChange = async () => {
    if (loaded?.sceneRef.source !== 'workspace') {
      return true;
    }

    return confirmDiscardLocalEdits(loaded.scenePath, 'Changing workspace');
  };

  const handleWorkspaceChange = async (onNeedsSceneSelection?: () => void) => {
    setError(null);

    if (!loaded) {
      await handleBrowse('.', 'workspace');
      onNeedsSceneSelection?.();
      return;
    }

    if (loaded.sceneRef.source === 'sample') {
      await handleBrowse('.', 'workspace');
      return;
    }

    const nextSceneRef = createWorkspaceRef(loaded.sceneRef.path);

    setLoading(true);

    try {
      const nextLoaded = await loadSceneData(nextSceneRef);
      commitLoadedScene(nextLoaded);
    } catch (loadError) {
      clearCurrentScene();
      await handleBrowse('.', 'workspace');
      const message = loadError instanceof Error ? loadError.message : 'Could not load scene in the new workspace';
      reportError(`${message}. Choose a scene from the new workspace to continue.`);
      onNeedsSceneSelection?.();
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScene = async (scenePath: string) => {
    const trimmedPath = scenePath.trim();
    if (!canPersistScenesToServer) {
      return false;
    }

    if (trimmedPath.length === 0) {
      reportError('Choose a JSON path for the new scene.');
      return false;
    }

    if (!trimmedPath.toLowerCase().endsWith('.json')) {
      reportError('New scene paths must end in .json.');
      return false;
    }

    if (!confirmDiscardLocalEdits(trimmedPath, 'Creating a new scene')) {
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const sceneRef = createWorkspaceRef(trimmedPath);
      await createSceneJson(sceneRef, createNewSceneTemplate(trimmedPath));
      const nextLoaded = await loadSceneData(sceneRef);
      commitLoadedScene(nextLoaded, `Created ${trimmedPath}`);
      return true;
    } catch (createError) {
      reportError(createError instanceof Error ? createError.message : 'Unknown create error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSceneAs = async (scenePath: string) => {
    const trimmedPath = scenePath.trim();
    if (!canPersistScenesToServer) {
      return false;
    }

    if (trimmedPath.length === 0) {
      reportError('Choose a JSON path for Save As.');
      return false;
    }

    if (!trimmedPath.toLowerCase().endsWith('.json')) {
      reportError('Save As paths must end in .json.');
      return false;
    }

    if (!loaded || !draftScene) {
      reportError('Load a scene before using Save As.');
      return false;
    }

    setSaving(true);
    setError(null);

    try {
      const sceneRef = createWorkspaceRef(trimmedPath);
      await createSceneJson(sceneRef, createSavableScene(loaded.rawScene, draftScene));
      const nextLoaded = await loadSceneData(sceneRef);
      commitLoadedScene(nextLoaded, `Saved scene as ${trimmedPath}`);
      return true;
    } catch (saveError) {
      reportError(saveError instanceof Error ? saveError.message : 'Unknown Save As error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveScene = async () => {
    if (!canSaveScene || !loaded || !draftScene) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await saveSceneJson(loaded.sceneRef, createSavableScene(loaded.rawScene, draftScene));
      const nextLoaded = await loadSceneData(loaded.sceneRef);
      setLoaded(nextLoaded);
      setSimulationState({
        simulationFiles: nextLoaded.simulationFiles,
        timeline: nextLoaded.timeline,
        channelNames: nextLoaded.channelNames,
        parsedSimulationFiles: nextLoaded.parsedSimulationFiles,
        fileErrors: nextLoaded.fileErrors,
      });
      resetDraftScene(cloneScene(nextLoaded.scene));
      updateSelectionFromLoadedScene(nextLoaded);
      reportSuccess(`Saved changes to ${loaded.scenePath}`);
      void handleBrowse(getDirectoryPath(loaded.sceneRef.path), 'workspace');
    } catch (saveError) {
      reportError(saveError instanceof Error ? saveError.message : 'Unknown save error');
    } finally {
      setSaving(false);
    }
  };

  const handleRevertDraft = () => {
    if (!loaded || !hasLocalEdits) {
      return false;
    }

    if (!window.confirm(`Discard unsaved local edits for ${loaded.scenePath}?`)) {
      return false;
    }

    resetDraftScene(cloneScene(loaded.scene));
    reportSuccess(`Reverted local edits for ${loaded.scenePath}`);
    updateSelectionFromLoadedScene(loaded);
    return true;
  };

  const updateDraftScene = (updater: (scene: NormalizedSceneConfig) => void) => {
    if (!draftScene) {
      return false;
    }

    const nextDraft = cloneScene(draftScene);
    updater(nextDraft);
    return pushDraftScene(nextDraft);
  };

  const updateDraftScenePreview = (updater: (scene: NormalizedSceneConfig) => void) => {
    if (!draftScene) {
      return false;
    }

    const nextDraft = cloneScene(draftScene);
    updater(nextDraft);
    return replaceDraftScene(nextDraft);
  };

  useEffect(() => {
    void handleLoad(initialSceneRef, { force: true });
  }, [initialSceneRef.path, initialSceneRef.source]);

  useEffect(() => {
    void browseSceneInputDirectory();
  }, []);

  useEffect(() => {
    if (!loaded || !draftScene || simulationDataKey === null) {
      return;
    }

    let cancelled = false;
    setSimulationLoading(true);

    void loadSimulationWorkspaceState(draftScene, loaded.sceneRef)
      .then((nextSimulationState) => {
        if (cancelled) {
          return;
        }

        setSimulationState(nextSimulationState);
        const inferredScene = createSceneDocument(draftScene, nextSimulationState.channelNames);
        void replaceDraftScene(inferredScene);
      })
      .finally(() => {
        if (!cancelled) {
          setSimulationLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [simulationDataKey, loaded?.scenePath, replaceDraftScene]);

  const handleUndo = () => undoDraftScene();
  const handleRedo = () => redoDraftScene();

  return {
    activeScene,
    browserError,
    browserListing,
    browserLoading,
    browseSceneInputDirectory,
    draftScene,
    error,
    handleBrowse,
    handleCreateScene,
    handleLoad,
    handleLoadWorkspacePath,
    handleWorkspaceChange,
    handleRevertDraft,
    handleSaveSceneAs,
    handleSaveScene,
    handleRedo,
    handleUndo,
    hasLocalEdits,
    canSaveScene,
    channelNames,
    diagnostics,
    fileErrors,
    loaded,
    loading,
    objectInspections,
    parsedSimulationFiles,
    saving,
    canRedoDraftScene,
    canUndoDraftScene,
    sceneInput,
    confirmWorkspaceChange,
    selectedObjectName,
    selectedVisualName,
    setError,
    setSceneInput,
    setSelectedObjectName,
    setSelectedVisualName,
    showWorkspaceShell,
    simulationFiles,
    simulationLoading,
    timeline,
    updateDraftScene,
    updateDraftScenePreview,
  };
}
