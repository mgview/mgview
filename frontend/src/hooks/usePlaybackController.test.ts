import assert from 'node:assert/strict';
import test from 'node:test';

import { getPlaybackResetKey } from './usePlaybackController.ts';
import type { Timeline } from '../core/types.ts';

const sharedTimeline: Timeline = {
  frames: [],
  tInitial: 0,
  tFinal: 10,
  tStep: 0.01,
};

test('getPlaybackResetKey changes when the scene identity changes even if timeline bounds match', () => {
  const baseKey = getPlaybackResetKey(sharedTimeline, 'sample:wooden_phantom/wooden_phantom.json');
  const guiKey = getPlaybackResetKey(sharedTimeline, 'sample:wooden_phantom/wooden_phantom_gui.json');

  assert.notEqual(baseKey, guiKey);
});

test('getPlaybackResetKey stays stable for the same scene and timeline', () => {
  const firstKey = getPlaybackResetKey(sharedTimeline, 'sample:wooden_phantom/wooden_phantom.json');
  const secondKey = getPlaybackResetKey(sharedTimeline, 'sample:wooden_phantom/wooden_phantom.json');

  assert.equal(firstKey, secondKey);
});
