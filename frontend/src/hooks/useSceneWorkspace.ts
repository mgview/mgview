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
  SceneConfig,
  SceneDiagnostic,
  SceneObjectInspection,
  Timeline,
} from '../core/types.ts';

export interface LoadedSceneData {
  rawScene: SceneConfig;
  scenePath: string;
  scene: NormalizedSceneConfig;
  simulationFiles: string[];
  timeline: Timeline;
  channelNames: string[];
  diagnostics: SceneDiagnostic[];
  objectInspections: SceneObjectInspection[];
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

  if (!rawScene.objects) {
    return nextScene;
  }

  nextScene.objects = {};
  for (const [objectName, rawObject] of Object.entries(rawScene.objects)) {
    const draftObject = draftScene.objects[objectName];
    if (!draftObject) {
      nextScene.objects[objectName] = structuredClone(rawObject);
      continue;
    }

    nextScene.objects[objectName] = {
      ...structuredClone(rawObject),
      type: draftObject.type,
      rotationFrame: draftObject.rotationFrame,
      visual: draftObject.visual ? structuredClone(draftObject.visual) : undefined,
    };
  }

  return nextScene;
}

async function loadSceneData(scenePath: string): Promise<LoadedSceneData> {
  const rawScene = await loadSceneJson(scenePath);
  const basePath = getBasePath(scenePath);
  const simulationFiles = expandSimulationFiles(rawScene.simulationData ?? [], basePath);

  const tables = await Promise.all(
    simulationFiles.map(async (filePath) => parseSimulationText(await loadTextFile(filePath), filePath))
  );

  const channelNames = [...new Set(tables.flatMap((table) => table.channelNames))];
  const scene = createSceneDocument(rawScene, channelNames);
  const diagnostics = collectSceneDiagnostics(rawScene, scene, simulationFiles, channelNames);
  const objectInspections = buildObjectInspections(rawScene, scene);
  const timeline = buildTimeline(tables);

  return {
    rawScene,
    scenePath,
    scene,
    simulationFiles,
    timeline,
    channelNames,
    diagnostics,
    objectInspections,
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

  const activeScene = draftScene ?? loaded?.scene ?? null;
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
    loaded,
    loading,
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
    updateDraftScene,
  };
}
