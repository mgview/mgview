import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateSceneEditorWorkspaceSplit } from './useWorkspaceLayoutSplits.ts';

const shellWidth = 1200;
const splitterFootprint = 20;

function resultingRendererWidth(workspaceSplit: number) {
  return (shellWidth - splitterFootprint) * workspaceSplit;
}

test('scene editor preserves renderer width when replacing plots', () => {
  const split = calculateSceneEditorWorkspaceSplit({
    shellWidth,
    showPlots: true,
    rightRail: 'none',
    visualSplit: 0.6,
    workspaceSplit: 0.68,
  });

  assert.notEqual(split, null);
  assert.equal(resultingRendererWidth(split as number), (shellWidth - splitterFootprint) * 0.6);
});

test('scene editor preserves renderer width when replacing the sim editor', () => {
  const split = calculateSceneEditorWorkspaceSplit({
    shellWidth,
    showPlots: false,
    rightRail: 'sim',
    visualSplit: 0.6,
    workspaceSplit: 0.68,
  });

  assert.notEqual(split, null);
  assert.equal(resultingRendererWidth(split as number), (shellWidth - splitterFootprint) * 0.68);
});

test('scene editor preserves renderer width when replacing plots and the sim editor', () => {
  const split = calculateSceneEditorWorkspaceSplit({
    shellWidth,
    showPlots: true,
    rightRail: 'sim',
    visualSplit: 0.6,
    workspaceSplit: 0.68,
  });

  assert.notEqual(split, null);
  const visualWorkspaceWidth = (shellWidth - splitterFootprint) * 0.68;
  const previousRendererWidth = (visualWorkspaceWidth - splitterFootprint) * 0.6;
  assert.equal(resultingRendererWidth(split as number), previousRendererWidth);
});
