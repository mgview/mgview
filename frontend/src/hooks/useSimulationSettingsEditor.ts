import { useMemo } from 'react';
import { isMotionGenesisInputPath, resolveSimulationFilePath } from '../core/simulationFilePath.ts';
import { useWorkspaceTextFileEditor } from './useWorkspaceTextFileEditor.ts';

interface UseSimulationSettingsEditorOptions {
  canEdit: boolean;
  scenePath: string | null;
  simulationSettings: string | null | undefined;
}

export function useSimulationSettingsEditor({
  canEdit,
  scenePath,
  simulationSettings,
}: UseSimulationSettingsEditorOptions) {
  const filePath = useMemo(
    () => resolveSimulationFilePath(scenePath, simulationSettings),
    [scenePath, simulationSettings]
  );
  const editor = useWorkspaceTextFileEditor({
    canEdit: canEdit && filePath !== null && isMotionGenesisInputPath(filePath),
    filePath,
  });

  return {
    canSaveSimFile: editor.canSaveFile && filePath !== null && isMotionGenesisInputPath(filePath),
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
