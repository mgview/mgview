import { useEffect, useMemo } from 'react';
import { createDefaultVisual } from '../components/editorShared.tsx';
import type {
  NormalizedSceneConfig,
  SceneObjectInspection,
  SceneVisual,
  VisualType,
} from '../core/types.ts';

type SceneObjectUpdater = (
  sceneObject: NonNullable<NonNullable<NormalizedSceneConfig['objects']>[string]>
) => void;

interface UseSceneSelectionEditorOptions {
  activeScene: NormalizedSceneConfig | null;
  draftScene: NormalizedSceneConfig | null;
  objectInspections: SceneObjectInspection[];
  selectedObjectName: string | null;
  selectedVisualName: string | null;
  setSelectedObjectName: (name: string | null) => void;
  setSelectedVisualName: (name: string | null) => void;
  updateDraftScene: (updater: (scene: NormalizedSceneConfig) => void) => void;
  updateDraftScenePreview: (updater: (scene: NormalizedSceneConfig) => void) => void;
}

export function useSceneSelectionEditor({
  activeScene,
  draftScene,
  objectInspections,
  selectedObjectName,
  selectedVisualName,
  setSelectedObjectName,
  setSelectedVisualName,
  updateDraftScene,
  updateDraftScenePreview,
}: UseSceneSelectionEditorOptions) {
  const selectedObject = useMemo(() => {
    if (!objectInspections.length || !selectedObjectName) {
      return undefined;
    }

    return objectInspections.find((entry) => entry.name === selectedObjectName);
  }, [objectInspections, selectedObjectName]);

  const selectedVisual = useMemo(() => {
    if (!selectedObject) {
      return undefined;
    }

    return selectedObject.visuals.find((entry) => entry.name === selectedVisualName) ?? selectedObject.visuals[0];
  }, [selectedObject, selectedVisualName]);

  useEffect(() => {
    if (!selectedObject) {
      setSelectedVisualName(null);
      return;
    }

    if (!selectedObject.visuals.some((visual) => visual.name === selectedVisualName)) {
      setSelectedVisualName(selectedObject.visuals[0]?.name ?? null);
    }
  }, [selectedObject, selectedVisualName, setSelectedVisualName]);

  const updateSelectedVisual = (updater: (visual: SceneVisual) => void) => {
    if (!draftScene || !selectedObject?.name || !selectedVisual?.name) {
      return;
    }

    updateDraftScene((scene) => {
      const visual = scene.objects[selectedObject.name]?.visual?.[selectedVisual.name];
      if (!visual) {
        return;
      }

      updater(visual);
    });
  };

  const updateSelectedVisualPreview = (updater: (visual: SceneVisual) => void) => {
    if (!draftScene || !selectedObject?.name || !selectedVisual?.name) {
      return;
    }

    updateDraftScenePreview((scene) => {
      const visual = scene.objects[selectedObject.name]?.visual?.[selectedVisual.name];
      if (!visual) {
        return;
      }

      updater(visual);
    });
  };

  const updateSelectedObject = (updater: SceneObjectUpdater) => {
    if (!draftScene || !selectedObject?.name) {
      return;
    }

    updateDraftScene((scene) => {
      const sceneObject = scene.objects[selectedObject.name];
      if (!sceneObject) {
        return;
      }

      updater(sceneObject);
    });
  };

  const createVisual = (type: VisualType) => {
    if (!draftScene || !selectedObject?.name) {
      return false;
    }

    const existingNames = new Set(
      Object.keys(draftScene.objects[selectedObject.name]?.visual ?? {})
    );
    let nextIndex = 1;
    let nextName = `visual_${nextIndex}`;
    while (existingNames.has(nextName)) {
      nextIndex += 1;
      nextName = `visual_${nextIndex}`;
    }

    updateDraftScene((scene) => {
      const sceneObject = scene.objects[selectedObject.name];
      if (!sceneObject) {
        return;
      }

      sceneObject.visual ??= {};
      sceneObject.visual[nextName] = createDefaultVisual(type, undefined, scene.workspaceSize);
    });
    setSelectedVisualName(nextName);
    return true;
  };

  const renameVisual = (currentName: string, nextName: string) => {
    const trimmedName = nextName.trim();
    if (!draftScene || !selectedObject?.name || trimmedName.length === 0 || currentName === trimmedName) {
      return currentName === trimmedName;
    }

    if (draftScene.objects[selectedObject.name]?.visual?.[trimmedName]) {
      return false;
    }

    updateDraftScene((scene) => {
      const sceneObject = scene.objects[selectedObject.name];
      const visuals = sceneObject?.visual;
      const visual = visuals?.[currentName];
      if (!sceneObject || !visuals || !visual) {
        return;
      }

      const reorderedEntries = Object.entries(visuals).map(([name, entry]) =>
        name === currentName ? [trimmedName, entry] : [name, entry]
      );
      sceneObject.visual = Object.fromEntries(reorderedEntries);
    });
    setSelectedVisualName(trimmedName);
    return true;
  };

  const deleteSelectedVisual = () => {
    if (!draftScene || !selectedObject?.name || !selectedVisual?.name) {
      return false;
    }

    const remainingVisualNames = selectedObject.visuals
      .map((visual) => visual.name)
      .filter((name) => name !== selectedVisual.name);

    updateDraftScene((scene) => {
      const sceneObject = scene.objects[selectedObject.name];
      if (!sceneObject?.visual?.[selectedVisual.name]) {
        return;
      }

      delete sceneObject.visual[selectedVisual.name];
    });
    setSelectedVisualName(remainingVisualNames[0] ?? null);
    return true;
  };

  const changeSelectedVisualType = (type: VisualType) => {
    if (!draftScene || !selectedObject?.name || !selectedVisual?.name) {
      return;
    }

    updateSelectedVisual((visual) => {
      const nextVisual = createDefaultVisual(type, visual.material, draftScene.workspaceSize);
      nextVisual.visible = visual.visible ?? true;
      nextVisual.position = visual.position ? { ...visual.position } : nextVisual.position;
      nextVisual.rotation = visual.rotation ? { ...visual.rotation } : nextVisual.rotation;
      nextVisual.material = visual.material ?? nextVisual.material;
      Object.keys(visual).forEach((key) => {
        delete visual[key];
      });
      Object.assign(visual, nextVisual);
    });
  };

  const liveSelectedVisual =
    selectedObject && selectedVisual && activeScene
      ? activeScene.objects[selectedObject.name]?.visual?.[selectedVisual.name]
      : undefined;

  const selectObject = (objectName: string, firstVisualName: string | null) => {
    setSelectedObjectName(objectName);
    setSelectedVisualName(firstVisualName);
  };

  return {
    changeSelectedVisualType,
    createVisual,
    deleteSelectedVisual,
    liveSelectedVisual,
    renameVisual,
    selectObject,
    selectedObject,
    selectedVisual,
    updateSelectedObject,
    updateSelectedVisual,
    updateSelectedVisualPreview,
  };
}
