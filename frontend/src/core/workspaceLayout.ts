import type { SceneLayoutConfig } from './types.ts';

const DEFAULT_VISUAL_SPLIT = 0.6;
const DEFAULT_WORKSPACE_SPLIT = 0.68;

function normalizeSplit(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(0.85, Math.max(0.15, value as number));
}

export const DEFAULT_SCENE_LAYOUT: Required<SceneLayoutConfig> = {
  showRenderer: true,
  showPlots: false,
  showEditorRail: true,
  focusTarget: null,
  visualSplit: DEFAULT_VISUAL_SPLIT,
  workspaceSplit: DEFAULT_WORKSPACE_SPLIT,
};

export function normalizeSceneLayout(layout: SceneLayoutConfig | undefined): Required<SceneLayoutConfig> {
  return {
    showRenderer: layout?.showRenderer ?? DEFAULT_SCENE_LAYOUT.showRenderer,
    showPlots: layout?.showPlots ?? DEFAULT_SCENE_LAYOUT.showPlots,
    showEditorRail: layout?.showEditorRail ?? DEFAULT_SCENE_LAYOUT.showEditorRail,
    focusTarget: layout?.focusTarget === 'renderer' || layout?.focusTarget === 'plots'
      ? layout.focusTarget
      : null,
    visualSplit: normalizeSplit(layout?.visualSplit, DEFAULT_SCENE_LAYOUT.visualSplit),
    workspaceSplit: normalizeSplit(layout?.workspaceSplit, DEFAULT_SCENE_LAYOUT.workspaceSplit),
  };
}
