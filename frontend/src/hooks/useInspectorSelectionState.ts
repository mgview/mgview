import { useEffect, useState } from 'react';
import type { InspectorEditorMode } from '../components/InspectorDrawer.tsx';
import type { SceneObjectInspection } from '../core/types.ts';

interface UseInspectorSelectionStateOptions {
  loadedScenePath: string | undefined;
  selectedObject: SceneObjectInspection | undefined;
  selectedObjectName: string | null;
  setSelectedObjectName: (name: string | null) => void;
  setSelectedVisualName: (name: string | null) => void;
}

export function useInspectorSelectionState({
  loadedScenePath,
  selectedObject,
  selectedObjectName,
  setSelectedObjectName,
  setSelectedVisualName,
}: UseInspectorSelectionStateOptions) {
  const [editorMode, setEditorMode] = useState<InspectorEditorMode>('visual');
  const [selectedSpanName, setSelectedSpanName] = useState<string | null>(null);
  const [selectedSpanVisualName, setSelectedSpanVisualName] = useState<string | null>(null);

  useEffect(() => {
    if (!loadedScenePath) {
      return;
    }

    setEditorMode('visual');
    setSelectedSpanName(null);
    setSelectedSpanVisualName(null);
  }, [loadedScenePath]);

  useEffect(() => {
    if (selectedObject) {
      setEditorMode('visual');
    }
  }, [selectedObject?.name]);

  const clearAllSelections = () => {
    setSelectedObjectName(null);
    setSelectedVisualName(null);
    setSelectedSpanName(null);
    setSelectedSpanVisualName(null);
  };

  const selectObjectForEditor = (
    objectName: string,
    firstVisualName: string | null,
    selectObject: (objectName: string, firstVisualName: string | null) => void
  ) => {
    setSelectedSpanName(null);
    setSelectedSpanVisualName(null);
    selectObject(objectName, firstVisualName);
  };

  const selectSpanForEditor = (
    spanName: string,
    firstVisualName: string | null,
    selectSpan: (spanName: string, firstVisualName: string | null) => void
  ) => {
    setSelectedObjectName(null);
    setSelectedVisualName(null);
    selectSpan(spanName, firstVisualName);
  };

  const beginSpanCreation = (createSpan: () => boolean) => {
    setSelectedObjectName(null);
    setSelectedVisualName(null);
    return createSpan();
  };

  const hasAnySelection =
    selectedObjectName !== null ||
    selectedSpanName !== null ||
    selectedSpanVisualName !== null;

  return {
    beginSpanCreation,
    clearAllSelections,
    editorMode,
    hasAnySelection,
    selectedSpanName,
    selectedSpanVisualName,
    selectObjectForEditor,
    selectSpanForEditor,
    setEditorMode,
    setSelectedSpanName,
    setSelectedSpanVisualName,
  };
}
