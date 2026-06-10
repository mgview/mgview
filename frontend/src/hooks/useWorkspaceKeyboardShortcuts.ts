import { useEffect } from 'react';
import type { useInspectorSelectionState } from './useInspectorSelectionState.ts';
import type { usePlaybackController } from './usePlaybackController.ts';
import type { useWorkspaceShell } from './useWorkspaceShell.ts';

interface UseWorkspaceKeyboardShortcutsOptions {
  canSaveScene: boolean;
  handleRedo: () => void;
  handleSaveScene: () => Promise<void>;
  handleUndo: () => void;
  hasLocalEdits: boolean;
  loading: boolean;
  playback: ReturnType<typeof usePlaybackController>;
  saving: boolean;
  selectionState: ReturnType<typeof useInspectorSelectionState>;
  shell: ReturnType<typeof useWorkspaceShell>;
}

export function useWorkspaceKeyboardShortcuts({
  canSaveScene,
  handleRedo,
  handleSaveScene,
  handleUndo,
  hasLocalEdits,
  loading,
  playback,
  saving,
  selectionState,
  shell,
}: UseWorkspaceKeyboardShortcutsOptions) {
  useEffect(() => {
    const isTextEditingTarget = (target: EventTarget | null) => {
      if (target instanceof HTMLTextAreaElement) {
        return true;
      }

      if (target instanceof HTMLInputElement) {
        return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color'].includes(target.type);
      }

      return target instanceof HTMLElement && target.isContentEditable;
    };

    const isInteractiveTarget = (target: EventTarget | null) =>
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLButtonElement ||
      (target instanceof HTMLElement && target.isContentEditable);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      const target = event.target;
      const isTextEditing = isTextEditingTarget(target);
      const isInteractive = isInteractiveTarget(target);
      const hasModifier = event.ctrlKey || event.metaKey;

      if (event.key === 'Escape') {
        const activeElement = document.activeElement;
        if (
          activeElement instanceof HTMLInputElement ||
          activeElement instanceof HTMLTextAreaElement ||
          activeElement instanceof HTMLSelectElement ||
          activeElement instanceof HTMLButtonElement ||
          (activeElement instanceof HTMLElement && activeElement.isContentEditable)
        ) {
          event.preventDefault();
          activeElement.blur();
          return;
        }

        if (
          !shell.loadOverlayOpen &&
          !shell.samplesOverlayOpen &&
          !shell.diagnosticsOpen &&
          !shell.simulationOverlayOpen
        ) {
          if (selectionState.hasAnySelection) {
            event.preventDefault();
            selectionState.clearAllSelections();
            return;
          }
        }
      }

      if (hasModifier && !isTextEditing && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if (hasModifier && !isTextEditing && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        handleRedo();
        return;
      }

      if (hasModifier && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (canSaveScene && !shell.loadOverlayOpen && !loading && !saving && hasLocalEdits) {
          void handleSaveScene();
        }
        return;
      }

      if (event.defaultPrevented || event.repeat || event.code !== 'Space') {
        return;
      }

      if (
        shell.loadOverlayOpen ||
        shell.samplesOverlayOpen ||
        shell.diagnosticsOpen ||
        shell.simulationOverlayOpen
      ) {
        return;
      }

      if (isInteractive) {
        return;
      }

      event.preventDefault();
      playback.togglePlay();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    canSaveScene,
    handleRedo,
    handleSaveScene,
    handleUndo,
    hasLocalEdits,
    loading,
    playback.togglePlay,
    saving,
    selectionState,
    shell.diagnosticsOpen,
    shell.loadOverlayOpen,
    shell.samplesOverlayOpen,
    shell.simulationOverlayOpen,
  ]);
}
