import assert from 'node:assert/strict';
import test from 'node:test';

import { createUniqueVisualName } from './visualNames.ts';

test('visual names fill the first available generated-name gap', () => {
  assert.equal(createUniqueVisualName([]), 'visual_1');
  assert.equal(createUniqueVisualName(['body', 'visual_1', 'visual_3']), 'visual_2');
});
