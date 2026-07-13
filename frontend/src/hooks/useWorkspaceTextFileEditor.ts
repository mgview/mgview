import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadTextFile, saveTextFile } from '../api/localFiles.ts';
import type { ApiRoot } from '../core/sceneRef.ts';

interface UseWorkspaceTextFileEditorOptions {
  canEdit?: boolean;
  canLoad?: boolean;
  filePath: string | null;
  fileRoot?: ApiRoot;
}

export function useWorkspaceTextFileEditor({
  canEdit = true,
  canLoad,
  filePath,
  fileRoot = 'workspace',
}: UseWorkspaceTextFileEditorOptions) {
  const [savedContent, setSavedContent] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedFilePath = useMemo(() => filePath?.trim() || null, [filePath]);
  const shouldLoad = canLoad ?? canEdit;
  const canSaveFile = canEdit && normalizedFilePath !== null;
  const hasEdits = savedContent !== null && draftContent !== savedContent;

  useEffect(() => {
    if (!shouldLoad || !normalizedFilePath) {
      setSavedContent(null);
      setDraftContent('');
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void loadTextFile(normalizedFilePath, fileRoot)
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
        setError(loadError instanceof Error ? loadError.message : 'Could not load file.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fileRoot, normalizedFilePath, shouldLoad]);

  const saveFile = useCallback(async (): Promise<boolean> => {
    if (!canSaveFile || !normalizedFilePath || !hasEdits) {
      return false;
    }

    setSaving(true);
    setError(null);

    try {
      await saveTextFile(normalizedFilePath, draftContent);
      setSavedContent(draftContent);
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save file.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [canSaveFile, draftContent, hasEdits, normalizedFilePath]);

  const revertFile = useCallback(() => {
    if (savedContent === null) {
      return false;
    }

    setDraftContent(savedContent);
    setError(null);
    return true;
  }, [savedContent]);

  return {
    canSaveFile,
    draftContent,
    error,
    filePath: normalizedFilePath,
    hasEdits,
    loading,
    revertFile,
    saveFile,
    saving,
    savedContent,
    setDraftContent,
  };
}
