import { useCallback, useEffect, useState } from 'react';
import { listLocalFiles } from '../api/localFiles.ts';
import type { MotionGenesisRunState } from '../api/localFiles.ts';
import { combineBrowserPath } from '../core/workspacePaths.ts';
import { createMotionGenesisSimFile } from '../core/createMotionGenesisSimFile.ts';
import {
  buildScenarioFromOdeBasePath,
  detectCompletedOdeOutputs,
  discoverSimulationDataEntries,
  sceneHasVisualizationData,
} from '../core/sceneScenarios.ts';
import {
  getSceneDirectoryPath,
  getSimulationSettingsRelativePath,
  isMotionGenesisInputPath,
  validateSimFileName,
} from '../core/simulationFilePath.ts';
import type { NormalizedSceneConfig, SceneScenario } from '../core/types.ts';
import { createSavableScene, type LoadedSceneData } from './useSceneWorkspace.ts';
import { useMotionGenesisRun } from './useMotionGenesisRun.ts';
import { useSimulationSettingsEditor } from './useSimulationSettingsEditor.ts';

export type SimulationImportDetection = {
  odeBasePath: string;
  simulationDataEntry: string;
};

export type SimulationImportPrompt = {
  detections: SimulationImportDetection[];
};

interface UseMotionGenesisWorkspaceOptions {
  activeScene: NormalizedSceneConfig | null;
  canSaveScene: boolean;
  handleImportScenarios: (scenarios: SceneScenario[], activeScenarioId: string) => Promise<boolean>;
  handleImportSimulationEntries: (entries: string[]) => Promise<boolean>;
  handleLinkSimulationSettings: (relativePath: string) => Promise<boolean>;
  handleRefreshSimulationData: (successMessage: string) => Promise<void>;
  handleSaveScene: () => Promise<void>;
  handleSetActiveScenario: (scenarioId: string) => Promise<boolean>;
  hasLocalEdits: boolean;
  loaded: LoadedSceneData | null;
  showSuccess: (message: string) => void;
}

export function useMotionGenesisWorkspace({
  activeScene,
  canSaveScene,
  handleImportScenarios,
  handleImportSimulationEntries,
  handleLinkSimulationSettings,
  handleRefreshSimulationData,
  handleSaveScene,
  handleSetActiveScenario,
  hasLocalEdits,
  loaded,
  showSuccess,
}: UseMotionGenesisWorkspaceOptions) {
  const [importPrompt, setImportPrompt] = useState<SimulationImportPrompt | null>(null);
  const [importingSimulationData, setImportingSimulationData] = useState(false);

  const handleMotionGenesisSuccess = useCallback(
    async (run: MotionGenesisRunState) => {
      if (!loaded || loaded.sceneRef.source !== 'workspace' || !activeScene) {
        return;
      }

      const persistedScene = createSavableScene(loaded.rawScene, activeScene);
      if (sceneHasVisualizationData(persistedScene)) {
        await handleRefreshSimulationData('Reloaded simulation data after Motion Genesis finished.');
        return;
      }

      const odePaths = detectCompletedOdeOutputs(run.output);
      if (odePaths.length === 0) {
        return;
      }

      const sceneDirectory = getSceneDirectoryPath(loaded.sceneRef.path);
      const detections = await discoverSimulationDataEntries(sceneDirectory, odePaths, (directoryPath) =>
        listLocalFiles(directoryPath, 'workspace')
      );
      if (detections.length === 0) {
        return;
      }

      setImportPrompt({ detections });
    },
    [activeScene, handleRefreshSimulationData, loaded]
  );

  const motionGenesisRun = useMotionGenesisRun(handleMotionGenesisSuccess);

  const dismissImportPrompt = useCallback(() => {
    if (!importingSimulationData) {
      setImportPrompt(null);
    }
  }, [importingSimulationData]);

  const confirmImportAsData = useCallback(
    async (entries: string[]) => {
      setImportingSimulationData(true);
      const didImport = await handleImportSimulationEntries(entries);
      setImportingSimulationData(false);
      if (didImport) {
        setImportPrompt(null);
      }
    },
    [handleImportSimulationEntries]
  );

  const confirmImportAsScenarios = useCallback(
    async (detections: SimulationImportDetection[]) => {
      const existingIds: string[] = [];
      const scenarios = detections.map((detection) => {
        const scenario = buildScenarioFromOdeBasePath(
          detection.odeBasePath,
          detection.simulationDataEntry,
          existingIds
        );
        existingIds.push(scenario.id);
        return scenario;
      });
      const activeScenarioId = scenarios[0]?.id;
      if (!activeScenarioId) {
        return;
      }

      setImportingSimulationData(true);
      const didImport = await handleImportScenarios(scenarios, activeScenarioId);
      setImportingSimulationData(false);
      if (didImport) {
        setImportPrompt(null);
      }
    },
    [handleImportScenarios]
  );

  const linkSimulationSettings = useCallback(
    async (relativePath: string) => {
      return handleLinkSimulationSettings(relativePath);
    },
    [handleLinkSimulationSettings]
  );

  const setActiveScenario = useCallback(
    async (scenarioId: string) => {
      return handleSetActiveScenario(scenarioId);
    },
    [handleSetActiveScenario]
  );

  const createAndLinkSimulationFile = useCallback(
    async (directoryPath: string, fileName: string): Promise<boolean> => {
      if (!loaded || loaded.sceneRef.source !== 'workspace') {
        motionGenesisRun.setError('Load a workspace scene before creating a simulation file.');
        return false;
      }

      const validationError = validateSimFileName(fileName);
      if (validationError) {
        motionGenesisRun.setError(validationError);
        return false;
      }

      const simulationFilePath = combineBrowserPath(
        directoryPath === '.' ? null : directoryPath,
        fileName.trim()
      );
      const relativeSettingsPath = getSimulationSettingsRelativePath(
        loaded.sceneRef.path,
        simulationFilePath
      );
      if (!relativeSettingsPath) {
        motionGenesisRun.setError('Could not resolve the simulation file path relative to this scene.');
        return false;
      }

      try {
        await createMotionGenesisSimFile(simulationFilePath);
      } catch (createError) {
        motionGenesisRun.setError(
          createError instanceof Error ? createError.message : 'Could not create simulation file.'
        );
        return false;
      }

      const didLink = await handleLinkSimulationSettings(relativeSettingsPath);
      if (didLink) {
        showSuccess(`Created simulation file ${simulationFilePath}`);
      }
      return didLink;
    },
    [handleLinkSimulationSettings, loaded, motionGenesisRun, showSuccess]
  );

  const simulationSettingsEditor = useSimulationSettingsEditor({
    canEdit: loaded?.sceneRef.source === 'workspace',
    scenePath: loaded?.sceneRef.source === 'workspace' ? loaded.sceneRef.path : null,
    simulationSettings: activeScene?.simulationSettings,
  });

  const runMotionGenesis = useCallback(async () => {
    if (!loaded || loaded.sceneRef.source !== 'workspace' || !activeScene?.simulationSettings) {
      motionGenesisRun.setError('Load a workspace scene with simulationSettings before running Motion Genesis.');
      return;
    }
    if (!isMotionGenesisInputPath(activeScene.simulationSettings)) {
      motionGenesisRun.setError(
        'Simulation File must point to a Motion Genesis input file with a .al or .txt extension.'
      );
      return;
    }
    if (simulationSettingsEditor.saving) {
      return;
    }

    if (simulationSettingsEditor.hasSimEdits && simulationSettingsEditor.canSaveSimFile) {
      const didSaveSim = await simulationSettingsEditor.saveSimFile();
      if (!didSaveSim) {
        return;
      }
    }

    void motionGenesisRun.beginRun(loaded.sceneRef.path, activeScene.simulationSettings);
  }, [
    activeScene,
    loaded,
    motionGenesisRun,
    simulationSettingsEditor.canSaveSimFile,
    simulationSettingsEditor.hasSimEdits,
    simulationSettingsEditor.saveSimFile,
    simulationSettingsEditor.saving,
  ]);

  const hasUnsavedChanges = hasLocalEdits || simulationSettingsEditor.hasSimEdits;
  const canSaveAnything =
    (hasLocalEdits && canSaveScene) ||
    (simulationSettingsEditor.hasSimEdits && simulationSettingsEditor.canSaveSimFile);

  const handleSaveAll = useCallback(async () => {
    if (simulationSettingsEditor.hasSimEdits && simulationSettingsEditor.canSaveSimFile) {
      const didSaveSim = await simulationSettingsEditor.saveSimFile();
      if (!didSaveSim) {
        return;
      }
      showSuccess(`Saved simulation file ${simulationSettingsEditor.filePath ?? ''}`.trim());
    }

    if (hasLocalEdits && canSaveScene) {
      await handleSaveScene();
    }
  }, [
    canSaveScene,
    handleSaveScene,
    hasLocalEdits,
    showSuccess,
    simulationSettingsEditor.canSaveSimFile,
    simulationSettingsEditor.filePath,
    simulationSettingsEditor.hasSimEdits,
    simulationSettingsEditor.saveSimFile,
  ]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return {
    canSaveAnything,
    confirmImportAsData,
    confirmImportAsScenarios,
    createAndLinkSimulationFile,
    dismissImportPrompt,
    handleSaveAll,
    hasUnsavedChanges,
    importPrompt,
    importingSimulationData,
    linkSimulationSettings,
    motionGenesisRun,
    runMotionGenesis,
    setActiveScenario,
    simulationSettingsEditor,
  };
}
