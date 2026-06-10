import { useCallback, useEffect } from 'react';
import type { NormalizedSceneConfig } from '../core/types.ts';
import type { LoadedSceneData } from './useSceneWorkspace.ts';
import { useMotionGenesisRun } from './useMotionGenesisRun.ts';
import { useSimulationSettingsEditor } from './useSimulationSettingsEditor.ts';

function isLikelyMotionGenesisInputPath(filePath: string): boolean {
  return /\.(al|txt|in)$/i.test(filePath);
}

interface UseMotionGenesisWorkspaceOptions {
  activeScene: NormalizedSceneConfig | null;
  canSaveScene: boolean;
  handleRefreshSimulationData: (successMessage: string) => Promise<void>;
  handleSaveScene: () => Promise<void>;
  hasLocalEdits: boolean;
  loaded: LoadedSceneData | null;
  showSuccess: (message: string) => void;
  updateDraftScene: (updater: (scene: NormalizedSceneConfig) => void) => void;
}

export function useMotionGenesisWorkspace({
  activeScene,
  canSaveScene,
  handleRefreshSimulationData,
  handleSaveScene,
  hasLocalEdits,
  loaded,
  showSuccess,
  updateDraftScene,
}: UseMotionGenesisWorkspaceOptions) {
  const handleMotionGenesisSuccess = useCallback(async () => {
    await handleRefreshSimulationData('Reloaded simulation data after Motion Genesis finished.');
  }, [handleRefreshSimulationData]);

  const motionGenesisRun = useMotionGenesisRun(handleMotionGenesisSuccess);

  const handleSimulationSettingsChange = useCallback(
    (value: string) => {
      updateDraftScene((scene) => {
        const trimmedValue = value.trim();
        if (trimmedValue.length > 0) {
          scene.simulationSettings = trimmedValue;
          return;
        }

        delete scene.simulationSettings;
      });
    },
    [updateDraftScene]
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
    if (!isLikelyMotionGenesisInputPath(activeScene.simulationSettings)) {
      motionGenesisRun.setError(
        'Simulation File must point to a Motion Genesis input file with a .al, .txt, or .in extension.'
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
    handleSaveAll,
    handleSimulationSettingsChange,
    hasUnsavedChanges,
    motionGenesisRun,
    runMotionGenesis,
    simulationSettingsEditor,
  };
}
