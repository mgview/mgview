import { useEffect, useMemo, useState } from 'react';
import {
  listLocalFiles,
  loadSceneJson,
  loadTextFile,
  saveSceneJson,
  type FileBrowserListing,
} from '../api/localFiles.ts';
import { expandSimulationFiles } from '../core/expandSimulationFiles.ts';
import { getBasePath } from '../core/pathUtils.ts';
import { parseSimulationText } from '../core/parseSimulationText.ts';
import { createSceneDocument } from '../core/sceneDocument.ts';
import { buildObjectInspections, collectSceneDiagnostics } from '../core/sceneInspector.ts';
import { buildTimeline } from '../core/timeline.ts';
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
  statusMessage?: string;
  actionLabel?: string;
}

function cloneScene(scene: NormalizedSceneConfig): NormalizedSceneConfig {
  return structuredClone(scene);
}

export function getDirectoryPath(filePath: string): string {
  const basePath = getBasePath(filePath).replace(/\/$/, '');
  return basePath || '.';
}

export function createSavableScene(
  rawScene: SceneConfig,
  draftScene: NormalizedSceneConfig
): SceneConfig {
  const nextScene = structuredClone(rawScene);

  nextScene.name = draftScene.name;
  nextScene.simulationData = [...draftScene.simulationData];
  nextScene.newtonianFrame = draftScene.newtonianFrame;
  nextScene.sceneOrigin = draftScene.sceneOrigin;
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

  nextScene.objects = {};
  for (const [objectName, draftObject] of Object.entries(draftScene.objects)) {
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
      if (nextScene.objects[objectName]) {
        continue;
      }

      nextScene.objects[objectName] = structuredClone(rawObject);
    }
  }

  if (!rawScene.spans) {
    return nextScene;
  }

  nextScene.spans = {};
  for (const [spanName, rawSpan] of Object.entries(rawScene.spans)) {
    const draftSpan = draftScene.spans[spanName];
    if (!draftSpan) {
      nextScene.spans[spanName] = structuredClone(rawSpan);
      continue;
    }

    nextScene.spans[spanName] = {
      ...structuredClone(rawSpan),
      type: draftSpan.type,
      point1: draftSpan.point1,
      point2: draftSpan.point2,
      showLabel: draftSpan.showLabel,
      visual: draftSpan.visual ? structuredClone(draftSpan.visual) : undefined,
    };
  }

  return nextScene;
}

async function loadSceneData(scenePath: string): Promise<LoadedSceneData> {
  const rawScene = await loadSceneJson(scenePath);
  const simulationState = await loadSimulationWorkspaceState(rawScene, scenePath);
  const channelNames = simulationState.channelNames;
  const scene = createSceneDocument(rawScene, channelNames);
  const diagnostics = collectSceneDiagnostics(
    rawScene,
    scene,
    simulationState.simulationFiles,
    channelNames,
    simulationState.fileErrors
  );
  const objectInspections = buildObjectInspections(rawScene, scene, channelNames);

  return {
    rawScene,
    scenePath,
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
  scenePath: string
): Promise<SimulationWorkspaceState> {
  const basePath = getBasePath(scenePath);
  const simulationFiles = expandSimulationFiles(scene.simulationData ?? [], basePath);
  const tableResults = await Promise.allSettled(
    simulationFiles.map(async (filePath) => parseSimulationText(await loadTextFile(filePath), filePath))
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

export function useSceneWorkspace(initialScenePath: string) {
  const [sceneInput, setSceneInput] = useState(initialScenePath);
  const [loaded, setLoaded] = useState<LoadedSceneData | null>(null);
  const [draftScene, setDraftScene] = useState<NormalizedSceneConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [browserListing, setBrowserListing] = useState<FileBrowserListing | null>(null);
  const [browserLoading, setBrowserLoading] = useState(false);
  const [browserError, setBrowserError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [selectedObjectName, setSelectedObjectName] = useState<string | null>(null);
  const [selectedVisualName, setSelectedVisualName] = useState<string | null>(null);
  const [simulationState, setSimulationState] = useState<SimulationWorkspaceState | null>(null);
  const [simulationLoading, setSimulationLoading] = useState(false);

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

    return collectSceneDiagnostics(authoredScene, activeScene, simulationFiles, channelNames, fileErrors);
  }, [activeScene, authoredScene, channelNames, fileErrors, loaded?.diagnostics, simulationFiles]);
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
  const showWorkspaceShell = loaded !== null || loading;

  const confirmDiscardLocalEdits = (nextScenePath: string, actionLabel: string): boolean => {
    if (!loaded || !draftScene || !hasLocalEdits) {
      return true;
    }

    return window.confirm(
      `${actionLabel} will discard unsaved local edits for ${loaded.scenePath}.\n\nContinue to ${nextScenePath}?`
    );
  };

  const updateSelectionFromLoadedScene = (nextLoaded: LoadedSceneData) => {
    setSelectedObjectName(nextLoaded.objectInspections[0]?.name ?? null);
    setSelectedVisualName(nextLoaded.objectInspections[0]?.visuals[0]?.name ?? null);
  };

  const handleBrowse = async (nextPath: string) => {
    setBrowserLoading(true);
    setBrowserError(null);

    try {
      setBrowserListing(await listLocalFiles(nextPath));
    } catch (browseError) {
      setBrowserError(browseError instanceof Error ? browseError.message : 'Unknown browse error');
    } finally {
      setBrowserLoading(false);
    }
  };

  const browseSceneInputDirectory = () => handleBrowse(getDirectoryPath(sceneInput));
  const simulationDataKey = useMemo(() => {
    if (!loaded || !draftScene) {
      return null;
    }

    return `${loaded.scenePath}::${JSON.stringify(draftScene.simulationData)}`;
  }, [draftScene?.simulationData, loaded?.scenePath]);

  const handleLoad = async (scenePath: string, options?: LoadSceneOptions) => {
    const settings = options ?? {};
    if (
      !settings.force &&
      !confirmDiscardLocalEdits(scenePath, settings.actionLabel ?? 'Loading another scene')
    ) {
      return false;
    }

    setLoading(true);
    setError(null);
    setSaveMessage(null);

    try {
      const nextLoaded = await loadSceneData(scenePath);
      setLoaded(nextLoaded);
      setSimulationState({
        simulationFiles: nextLoaded.simulationFiles,
        timeline: nextLoaded.timeline,
        channelNames: nextLoaded.channelNames,
        parsedSimulationFiles: nextLoaded.parsedSimulationFiles,
        fileErrors: nextLoaded.fileErrors,
      });
      setSceneInput(scenePath);
      setDraftScene(cloneScene(nextLoaded.scene));
      updateSelectionFromLoadedScene(nextLoaded);
      const url = new URL(window.location.href);
      url.searchParams.set('scene', scenePath);
      window.history.replaceState({}, '', url);
      setSaveMessage(settings.statusMessage ?? `Loaded ${scenePath}`);
      void handleBrowse(getDirectoryPath(scenePath));
      return true;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unknown load error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSaveScene = async () => {
    if (!loaded || !draftScene) {
      return;
    }

    setSaving(true);
    setSaveMessage(null);

    try {
      await saveSceneJson(loaded.scenePath, createSavableScene(loaded.rawScene, draftScene));
      const nextLoaded = await loadSceneData(loaded.scenePath);
      setLoaded(nextLoaded);
      setSimulationState({
        simulationFiles: nextLoaded.simulationFiles,
        timeline: nextLoaded.timeline,
        channelNames: nextLoaded.channelNames,
        parsedSimulationFiles: nextLoaded.parsedSimulationFiles,
        fileErrors: nextLoaded.fileErrors,
      });
      setDraftScene(cloneScene(nextLoaded.scene));
      updateSelectionFromLoadedScene(nextLoaded);
      setSaveMessage(`Saved changes to ${loaded.scenePath}`);
      void handleBrowse(getDirectoryPath(loaded.scenePath));
    } catch (saveError) {
      setSaveMessage(saveError instanceof Error ? saveError.message : 'Unknown save error');
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

    setDraftScene(cloneScene(loaded.scene));
    setSaveMessage(`Reverted local edits for ${loaded.scenePath}`);
    updateSelectionFromLoadedScene(loaded);
    return true;
  };

  const updateDraftScene = (updater: (scene: NormalizedSceneConfig) => void) => {
    setDraftScene((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }

      const nextDraft = cloneScene(currentDraft);
      updater(nextDraft);
      return nextDraft;
    });
  };

  useEffect(() => {
    void handleLoad(initialScenePath, { force: true });
  }, [initialScenePath]);

  useEffect(() => {
    void browseSceneInputDirectory();
  }, []);

  useEffect(() => {
    if (!loaded || !draftScene || simulationDataKey === null) {
      return;
    }

    let cancelled = false;
    setSimulationLoading(true);

    void loadSimulationWorkspaceState(draftScene, loaded.scenePath)
      .then((nextSimulationState) => {
        if (cancelled) {
          return;
        }

        setSimulationState(nextSimulationState);
        setDraftScene((currentDraft) => {
          if (!currentDraft) {
            return currentDraft;
          }

          const inferredScene = createSceneDocument(currentDraft, nextSimulationState.channelNames);
          return JSON.stringify(inferredScene) === JSON.stringify(currentDraft) ? currentDraft : inferredScene;
        });
      })
      .finally(() => {
        if (!cancelled) {
          setSimulationLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loaded?.scenePath, simulationDataKey]);

  return {
    activeScene,
    browserError,
    browserListing,
    browserLoading,
    browseSceneInputDirectory,
    draftScene,
    error,
    handleBrowse,
    handleLoad,
    handleRevertDraft,
    handleSaveScene,
    hasLocalEdits,
    channelNames,
    diagnostics,
    fileErrors,
    loaded,
    loading,
    objectInspections,
    parsedSimulationFiles,
    saveMessage,
    saving,
    sceneInput,
    selectedObjectName,
    selectedVisualName,
    setDraftScene,
    setSaveMessage,
    setSceneInput,
    setSelectedObjectName,
    setSelectedVisualName,
    showWorkspaceShell,
    simulationFiles,
    simulationLoading,
    timeline,
    updateDraftScene,
  };
}
