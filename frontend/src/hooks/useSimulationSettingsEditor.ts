import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadTextFile, saveTextFile } from '../api/localFiles.ts';
import { isMotionGenesisInputPath, resolveSimulationFilePath } from '../core/simulationFilePath.ts';

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
  const [savedContent, setSavedContent] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filePath = useMemo(
    () => resolveSimulationFilePath(scenePath, simulationSettings),
    [scenePath, simulationSettings]
  );
  const canSaveSimFile = canEdit && filePath !== null && isMotionGenesisInputPath(filePath);
  const hasSimEdits = savedContent !== null && draftContent !== savedContent;

  useEffect(() => {
    if (!canEdit || !filePath || !isMotionGenesisInputPath(filePath)) {
      setSavedContent(null);
      setDraftContent('');
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void loadTextFile(filePath)
      .then((text) => {
        if (cancelled) {
          return;
        }
        setSavedContent(text);
        setDraftContent(text);
      })
      .catch((loadError) => {
        if (cancelled) {
          return;
        }
        setSavedContent(null);
        setDraftContent('');
        setError(loadError instanceof Error ? loadError.message : 'Could not load simulation file.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canEdit, filePath]);

  const saveSimFile = useCallback(async (): Promise<boolean> => {
    if (!canSaveSimFile || !filePath || !hasSimEdits) {
      return false;
    }

    setSaving(true);
    setError(null);

    try {
      await saveTextFile(filePath, draftContent);
      setSavedContent(draftContent);
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save simulation file.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [canSaveSimFile, draftContent, filePath, hasSimEdits]);

  const revertSimFile = useCallback(() => {
    if (savedContent === null) {
      return false;
    }

    setDraftContent(savedContent);
    setError(null);
    return true;
  }, [savedContent]);

  return {
    canSaveSimFile,
    draftContent,
    error,
    filePath,
    hasSimEdits,
    loading,
    revertSimFile,
    saveSimFile,
    saving,
    setDraftContent,
  };
}
