import assert from 'node:assert/strict';
import test from 'node:test';

import { APP_DIR, combineBrowserPath, validateFolderName, workspacePath } from './workspacePaths.ts';

test('workspacePath uses app-relative paths when APP_DIR is empty', () => {
  assert.equal(APP_DIR, '');
  assert.equal(workspacePath('assets', 'textures', 'foo.png'), 'assets/textures/foo.png');
});

test('combineBrowserPath joins nested workspace folders', () => {
  assert.equal(combineBrowserPath('.', 'scene.json'), 'scene.json');
  assert.equal(combineBrowserPath('projects/demo', 'scene.json'), 'projects/demo/scene.json');
});

test('validateFolderName rejects unsupported folder names', () => {
  assert.equal(validateFolderName(''), 'Enter a folder name.');
  assert.equal(validateFolderName(' child/dir '), 'Folder names cannot include slashes.');
  assert.equal(validateFolderName('child\\dir'), 'Folder names cannot include slashes.');
  assert.equal(validateFolderName('..'), 'Folder names cannot include "..".');
  assert.equal(validateFolderName('foo..bar'), 'Folder names cannot include "..".');
  assert.equal(validateFolderName('.hidden'), 'Folder names cannot start with ".".');
  assert.equal(validateFolderName('project'), null);
});
