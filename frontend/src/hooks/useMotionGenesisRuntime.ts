import { useCallback, useEffect, useState } from 'react';
import {
  getMotionGenesisRuntime,
  setMotionGenesisExecutable,
  type MotionGenesisRuntimeInfo,
} from '../api/localFiles.ts';
import { canPersistScenesToServer } from '../api/runtimeMode.ts';

export function useMotionGenesisRuntime() {
  const [runtimeInfo, setRuntimeInfo] = useState<MotionGenesisRuntimeInfo | null>(null);
  const [loading, setLoading] = useState(canPersistScenesToServer);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftExecutablePath, setDraftExecutablePath] = useState('');
  const [saving, setSaving] = useState(false);

  const refreshRuntimeInfo = useCallback(async () => {
    if (!canPersistScenesToServer) {
      setLoading(false);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const info = await getMotionGenesisRuntime();
      setRuntimeInfo(info);
      return info;
    } catch (refreshError) {
      const message =
        refreshError instanceof Error
          ? refreshError.message
          : 'Could not load Motion Genesis runtime settings';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshRuntimeInfo();
  }, [refreshRuntimeInfo]);

  const openPicker = () => {
    setDraftExecutablePath(runtimeInfo?.configuredPath ?? runtimeInfo?.command ?? '');
    setPickerOpen(true);
  };

  const closePicker = () => {
    setPickerOpen(false);
  };

  const applyExecutablePath = async () => {
    const trimmedPath = draftExecutablePath.trim();
    if (trimmedPath.length === 0) {
      const message = 'Enter the Motion Genesis executable path.';
      setError(message);
      return false;
    }

    setSaving(true);
    setError(null);

    try {
      const info = await setMotionGenesisExecutable(trimmedPath);
      setRuntimeInfo(info);
      setPickerOpen(false);
      return true;
    } catch (applyError) {
      const message =
        applyError instanceof Error ? applyError.message : 'Could not update Motion Genesis executable';
      setError(message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const clearConfiguredExecutable = async () => {
    setSaving(true);
    setError(null);

    try {
      const info = await setMotionGenesisExecutable('');
      setRuntimeInfo(info);
      setDraftExecutablePath(info.command);
      return true;
    } catch (applyError) {
      const message =
        applyError instanceof Error ? applyError.message : 'Could not reset Motion Genesis executable';
      setError(message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const selectCandidate = (candidatePath: string) => {
    setDraftExecutablePath(candidatePath);
  };

  return {
    applyExecutablePath,
    clearConfiguredExecutable,
    closePicker,
    draftExecutablePath,
    error,
    loading,
    openPicker,
    pickerOpen,
    refreshRuntimeInfo,
    runtimeInfo,
    saving,
    selectCandidate,
    setDraftExecutablePath,
  };
}
