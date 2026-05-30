import assert from 'node:assert/strict';
import test from 'node:test';

import { APP_DIR, workspacePath } from './workspacePaths.ts';

test('workspacePath uses app-relative paths when APP_DIR is empty', () => {
  assert.equal(APP_DIR, '');
  assert.equal(workspacePath('assets', 'textures', 'foo.png'), 'assets/textures/foo.png');
});
