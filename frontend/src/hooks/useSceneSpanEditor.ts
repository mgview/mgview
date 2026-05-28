import { useEffect, useMemo } from 'react';
import type {
  NormalizedSceneConfig,
  SceneSpan,
  SceneSpanVisual,
} from '../core/types.ts';

function createDefaultSpanVisual(): SceneSpanVisual {
  return {
    visible: true,
    material: { name: 'SHINY_RED' },
    thickness: 1,
  };
}

function createDefaultSpan(scene: NormalizedSceneConfig): SceneSpan {
  const pointNames = Object.entries(scene.objects)
    .filter(([, sceneObject]) => sceneObject.type === 'point')
    .map(([name]) => name);
  const point1 = pointNames[0] ?? scene.sceneOrigin;
  const point2 = pointNames[1] ?? point1;

  return {
    type: 'cable',
    point1,
    point2,
    showLabel: false,
    visual: {
      wire: createDefaultSpanVisual(),
    },
  };
}

interface UseSceneSpanEditorOptions {
  activeScene: NormalizedSceneConfig | null;
  draftScene: NormalizedSceneConfig | null;
  selectedSpanName: string | null;
  selectedSpanVisualName: string | null;
  setSelectedSpanName: (name: string | null) => void;
  setSelectedSpanVisualName: (name: string | null) => void;
  updateDraftScene: (updater: (scene: NormalizedSceneConfig) => void) => void;
}

export function useSceneSpanEditor({
  activeScene,
  draftScene,
  selectedSpanName,
  selectedSpanVisualName,
  setSelectedSpanName,
  setSelectedSpanVisualName,
  updateDraftScene,
}: UseSceneSpanEditorOptions) {
  const spanNames = useMemo(() => Object.keys(activeScene?.spans ?? {}), [activeScene?.spans]);

  const selectedSpanResolvedName = useMemo(() => {
    if (selectedSpanName && spanNames.includes(selectedSpanName)) {
      return selectedSpanName;
    }

    return null;
  }, [selectedSpanName, spanNames]);

  const selectedSpan =
    selectedSpanResolvedName && draftScene
      ? draftScene.spans[selectedSpanResolvedName]
      : undefined;

  const liveSelectedSpan =
    selectedSpanResolvedName && activeScene
      ? activeScene.spans[selectedSpanResolvedName]
      : undefined;

  const spanVisualNames = useMemo(
    () => Object.keys(liveSelectedSpan?.visual ?? selectedSpan?.visual ?? {}),
    [liveSelectedSpan?.visual, selectedSpan?.visual]
  );

  const selectedSpanVisualResolvedName = useMemo(() => {
    if (selectedSpanVisualName && spanVisualNames.includes(selectedSpanVisualName)) {
      return selectedSpanVisualName;
    }

    return spanVisualNames[0] ?? null;
  }, [selectedSpanVisualName, spanVisualNames]);

  const selectedSpanVisual =
    selectedSpanVisualResolvedName && selectedSpan?.visual
      ? selectedSpan.visual[selectedSpanVisualResolvedName]
      : undefined;

  const liveSelectedSpanVisual =
    selectedSpanVisualResolvedName && liveSelectedSpan?.visual
      ? liveSelectedSpan.visual[selectedSpanVisualResolvedName]
      : undefined;

  useEffect(() => {
    if (!selectedSpanResolvedName) {
      setSelectedSpanVisualName(null);
      return;
    }

    if (selectedSpanVisualResolvedName !== selectedSpanVisualName) {
      setSelectedSpanVisualName(selectedSpanVisualResolvedName);
    }
  }, [
    selectedSpanResolvedName,
    selectedSpanVisualName,
    selectedSpanVisualResolvedName,
    setSelectedSpanVisualName,
  ]);

  const selectSpan = (spanName: string, firstVisualName: string | null) => {
    setSelectedSpanName(spanName);
    setSelectedSpanVisualName(firstVisualName);
  };

  const updateSelectedSpan = (updater: (span: SceneSpan) => void) => {
    if (!selectedSpanResolvedName) {
      return;
    }

    updateDraftScene((scene) => {
      const span = scene.spans[selectedSpanResolvedName];
      if (!span) {
        return;
      }

      updater(span);
    });
  };

  const updateSelectedSpanVisual = (updater: (visual: SceneSpanVisual) => void) => {
    if (!selectedSpanResolvedName || !selectedSpanVisualResolvedName) {
      return;
    }

    updateDraftScene((scene) => {
      const visual = scene.spans[selectedSpanResolvedName]?.visual?.[selectedSpanVisualResolvedName];
      if (!visual) {
        return;
      }

      updater(visual);
    });
  };

  const createSpan = () => {
    if (!draftScene) {
      return false;
    }

    const existingNames = new Set(Object.keys(draftScene.spans));
    let nextIndex = 1;
    let nextName = `span_${nextIndex}`;
    while (existingNames.has(nextName)) {
      nextIndex += 1;
      nextName = `span_${nextIndex}`;
    }

    updateDraftScene((scene) => {
      scene.spans[nextName] = createDefaultSpan(scene);
    });

    selectSpan(nextName, 'wire');
    return true;
  };

  const renameSpan = (currentName: string, nextName: string) => {
    const trimmedName = nextName.trim();
    if (!draftScene || trimmedName.length === 0 || currentName === trimmedName) {
      return currentName === trimmedName;
    }

    if (draftScene.spans[trimmedName]) {
      return false;
    }

    updateDraftScene((scene) => {
      const span = scene.spans[currentName];
      if (!span) {
        return;
      }

      const reorderedEntries = Object.entries(scene.spans).map(([name, entry]) =>
        name === currentName ? [trimmedName, entry] : [name, entry]
      );
      scene.spans = Object.fromEntries(reorderedEntries);
    });
    setSelectedSpanName(trimmedName);
    return true;
  };

  const deleteSelectedSpan = () => {
    if (!selectedSpanResolvedName || !draftScene) {
      return false;
    }

    const remainingSpanNames = Object.keys(draftScene.spans).filter((name) => name !== selectedSpanResolvedName);
    updateDraftScene((scene) => {
      delete scene.spans[selectedSpanResolvedName];
    });
    setSelectedSpanName(remainingSpanNames[0] ?? null);
    setSelectedSpanVisualName(null);
    return true;
  };

  const createSpanVisual = () => {
    if (!selectedSpanResolvedName || !selectedSpan) {
      return false;
    }

    const existingNames = new Set(Object.keys(selectedSpan.visual ?? {}));
    let nextIndex = 1;
    let nextName = `wire_${nextIndex}`;
    while (existingNames.has(nextName)) {
      nextIndex += 1;
      nextName = `wire_${nextIndex}`;
    }

    updateDraftScene((scene) => {
      const span = scene.spans[selectedSpanResolvedName];
      if (!span) {
        return;
      }

      span.visual ??= {};
      span.visual[nextName] = createDefaultSpanVisual();
    });
    setSelectedSpanVisualName(nextName);
    return true;
  };

  const deleteSelectedSpanVisual = () => {
    if (!selectedSpanResolvedName || !selectedSpanVisualResolvedName || !selectedSpan) {
      return false;
    }

    const remainingVisualNames = Object.keys(selectedSpan.visual ?? {}).filter(
      (name) => name !== selectedSpanVisualResolvedName
    );

    updateDraftScene((scene) => {
      const span = scene.spans[selectedSpanResolvedName];
      if (!span?.visual?.[selectedSpanVisualResolvedName]) {
        return;
      }

      delete span.visual[selectedSpanVisualResolvedName];
    });
    setSelectedSpanVisualName(remainingVisualNames[0] ?? null);
    return true;
  };

  return {
    createSpan,
    createSpanVisual,
    deleteSelectedSpan,
    deleteSelectedSpanVisual,
    liveSelectedSpan,
    liveSelectedSpanVisual,
    renameSpan,
    selectSpan,
    selectedSpan,
    selectedSpanResolvedName,
    selectedSpanVisualResolvedName,
    updateSelectedSpan,
    updateSelectedSpanVisual,
  };
}
