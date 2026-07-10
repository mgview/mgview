import { useCallback, useEffect } from 'react';
import { combineBrowserPath } from '../core/workspacePaths.ts';
import { createMotionGenesisSimFile } from '../core/createMotionGenesisSimFile.ts';
import {
  getSimulationSettingsRelativePath,
  isMotionGenesisInputPath,
  validateSimFileName,
} from '../core/simulationFilePath.ts';
import type { NormalizedSceneConfig } from '../core/types.ts';
import type { LoadedSceneData } from './useSceneWorkspace.ts';
import { useMotionGenesisRun } from './useMotionGenesisRun.ts';
import { useSimulationSettingsEditor } from './useSimulationSettingsEditor.ts';

interface UseMotionGenesisWorkspaceOptions {
  activeScene: NormalizedSceneConfig | null;
  canSaveScene: boolean;
  handleLinkSimulationSettings: (relativePath: string) => Promise<boolean>;
  handleRefreshSimulationData: (successMessage: string) => Promise<void>;
  handleSaveScene: () => Promise<void>;
  hasLocalEdits: boolean;
  loaded: LoadedSceneData | null;
  showSuccess: (message: string) => void;
}

export function useMotionGenesisWorkspace({
  activeScene,
  canSaveScene,
  handleLinkSimulationSettings,
  handleRefreshSimulationData,
  handleSaveScene,
  hasLocalEdits,
  loaded,
  showSuccess,
}: UseMotionGenesisWorkspaceOptions) {
  const handleMotionGenesisSuccess = useCallback(async () => {
    await handleRefreshSimulationData('Reloaded simulation data after Motion Genesis finished.');
  }, [handleRefreshSimulationData]);

  const motionGenesisRun = useMotionGenesisRun(handleMotionGenesisSuccess);

  const linkSimulationSettings = useCallback(
    async (relativePath: string) => {
      return handleLinkSimulationSettings(relativePath);
    },
    [handleLinkSimulationSettings]
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
    createAndLinkSimulationFile,
    handleSaveAll,
    hasUnsavedChanges,
    linkSimulationSettings,
    motionGenesisRun,
    runMotionGenesis,
    simulationSettingsEditor,
  };
}
