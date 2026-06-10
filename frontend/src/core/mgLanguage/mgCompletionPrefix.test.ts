import assert from 'node:assert/strict';
import test from 'node:test';
import { getCompletionPrefix } from './mgCompletionPrefix.ts';

test('getCompletionPrefix extracts member identifier after dot', () => {
  const line = 'System.getDynamics';
  const result = getCompletionPrefix(line, line.length + 1);

  assert.equal(result.prefix, 'getDynamics');
  assert.equal(result.isMemberAccess, true);
  assert.equal(result.startColumn, 'System.'.length + 1);
});

test('getCompletionPrefix returns empty prefix immediately after dot', () => {
  const line = 'System.';
  const result = getCompletionPrefix(line, line.length + 1);

  assert.equal(result.prefix, '');
  assert.equal(result.isMemberAccess, true);
  assert.equal(result.startColumn, line.length + 1);
});

test('getCompletionPrefix handles partial member identifier', () => {
  const line = '  foo = System.getDyn';
  const result = getCompletionPrefix(line, line.length + 1);

  assert.equal(result.prefix, 'getDyn');
  assert.equal(result.isMemberAccess, true);
});

test('getCompletionPrefix handles standalone identifier', () => {
  const line = 'SetMass';
  const result = getCompletionPrefix(line, line.length + 1);

  assert.equal(result.prefix, 'SetMass');
  assert.equal(result.isMemberAccess, false);
  assert.equal(result.startColumn, 1);
});
