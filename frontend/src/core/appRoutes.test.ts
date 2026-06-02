import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveAppRoute } from './appRoutes.ts';

test('resolveAppRoute matches the workspace shell at the app root', () => {
  assert.equal(resolveAppRoute('/mgview/', '/mgview/'), 'app');
  assert.equal(resolveAppRoute('/mgview', '/mgview/'), 'app');
});

test('resolveAppRoute matches docs inside the mounted app', () => {
  assert.equal(resolveAppRoute('/mgview/docs/', '/mgview/'), 'documentation');
  assert.equal(resolveAppRoute('/mgview/docs', '/mgview/'), 'documentation');
});

test('resolveAppRoute supports a root-mounted static app', () => {
  assert.equal(resolveAppRoute('/docs/', '/'), 'documentation');
  assert.equal(resolveAppRoute('/', '/'), 'app');
});
