import type { SceneLayoutConfig } from './types.ts';

export const DEFAULT_SCENE_LAYOUT: Required<SceneLayoutConfig> = {
  showRenderer: true,
  showPlots: false,
  showEditorRail: true,
  focusTarget: null,
};

export function normalizeSceneLayout(layout: SceneLayoutConfig | undefined): Required<SceneLayoutConfig> {
  return {
    showRenderer: layout?.showRenderer ?? DEFAULT_SCENE_LAYOUT.showRenderer,
    showPlots: layout?.showPlots ?? DEFAULT_SCENE_LAYOUT.showPlots,
    showEditorRail: layout?.showEditorRail ?? DEFAULT_SCENE_LAYOUT.showEditorRail,
    focusTarget: layout?.focusTarget === 'renderer' || layout?.focusTarget === 'plots'
      ? layout.focusTarget
      : null,
  };
}
