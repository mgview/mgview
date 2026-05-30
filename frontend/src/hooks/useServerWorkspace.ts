import { useCallback, useEffect, useState } from 'react';
import { getWorkspaceInfo, setWorkspaceRoot, type WorkspaceInfo } from '../api/localFiles.ts';
import { canPersistScenesToServer } from '../api/runtimeMode.ts';

export function useServerWorkspace(
  showSuccess?: (message: string) => void,
  showError?: (message: string) => void
) {
  const [workspaceInfo, setWorkspaceInfo] = useState<WorkspaceInfo | null>(null);
  const [loading, setLoading] = useState(canPersistScenesToServer);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftWorkspaceRoot, setDraftWorkspaceRoot] = useState('');
  const [saving, setSaving] = useState(false);

  const refreshWorkspaceInfo = useCallback(async () => {
    if (!canPersistScenesToServer) {
      setLoading(false);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const info = await getWorkspaceInfo();
      setWorkspaceInfo(info);
      return info;
    } catch (refreshError) {
      const message =
        refreshError instanceof Error ? refreshError.message : 'Could not load workspace settings';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshWorkspaceInfo();
  }, [refreshWorkspaceInfo]);

  const openPicker = () => {
    setDraftWorkspaceRoot(workspaceInfo?.workspaceRoot ?? '');
    setPickerOpen(true);
  };

  const closePicker = () => {
    setPickerOpen(false);
  };

  const applyWorkspaceRoot = async (onApplied?: () => void | Promise<void>) => {
    const trimmedRoot = draftWorkspaceRoot.trim();
    if (trimmedRoot.length === 0) {
      const message = 'Enter a workspace folder path.';
      setError(message);
      showError?.(message);
      return false;
    }

    setSaving(true);
    setError(null);

    try {
      const info = await setWorkspaceRoot(trimmedRoot);
      setWorkspaceInfo(info);
      setPickerOpen(false);
      showSuccess?.(`Workspace set to ${info.workspaceRoot}`);
      await onApplied?.();
      return true;
    } catch (applyError) {
      const message =
        applyError instanceof Error ? applyError.message : 'Could not update workspace';
      setError(message);
      showError?.(message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const useDefaultWorkspaceRoot = () => {
    if (workspaceInfo?.defaultWorkspaceRoot) {
      setDraftWorkspaceRoot(workspaceInfo.defaultWorkspaceRoot);
    }
  };

  return {
    applyWorkspaceRoot,
    closePicker,
    draftWorkspaceRoot,
    error,
    loading,
    openPicker,
    pickerOpen,
    refreshWorkspaceInfo,
    saving,
    setDraftWorkspaceRoot,
    useDefaultWorkspaceRoot,
    workspaceInfo,
  };
}
