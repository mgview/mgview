import { useMemo } from 'react';
import {
  isMotionGenesisInputPath,
  resolveSimulationFileLoadRequest,
} from '../core/simulationFilePath.ts';
import type { SceneRef } from '../core/sceneRef.ts';
import { useWorkspaceTextFileEditor } from './useWorkspaceTextFileEditor.ts';

interface UseSimulationSettingsEditorOptions {
  canSave: boolean;
  sceneRef: SceneRef | null;
  simulationSettings: string | null | undefined;
}

export function useSimulationSettingsEditor({
  canSave,
  sceneRef,
  simulationSettings,
}: UseSimulationSettingsEditorOptions) {
  const fileRequest = useMemo(
    () => resolveSimulationFileLoadRequest(sceneRef, simulationSettings),
    [sceneRef, simulationSettings]
  );
  const filePath = fileRequest?.path ?? null;
  const canLoadFile = filePath !== null && isMotionGenesisInputPath(filePath);
  const editor = useWorkspaceTextFileEditor({
    canEdit: canSave && canLoadFile,
    canLoad: canLoadFile,
    filePath,
    fileRoot: fileRequest?.root ?? 'workspace',
  });

  return {
    canSaveSimFile: canSave && editor.canSaveFile && canLoadFile,
    draftContent: editor.draftContent,
    error: editor.error,
    filePath,
    hasSimEdits: editor.hasEdits,
    loading: editor.loading,
    revertSimFile: editor.revertFile,
    saveSimFile: editor.saveFile,
    saving: editor.saving,
    setDraftContent: editor.setDraftContent,
  };
}
