const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const path = require('path');

const { parseServerArgs } = require('./serverCli.js');

test('parseServerArgs accepts --port and --workspace', () => {
  const args = parseServerArgs([
    'node',
    'server.js',
    '--port',
    '9000',
    '--workspace',
    '/tmp/my-workspace',
  ]);
  assert.equal(args.port, 9000);
  assert.equal(args.workspace, '/tmp/my-workspace');
  assert.equal(args.help, false);
});

test('parseServerArgs accepts legacy positional port', () => {
  const args = parseServerArgs(['node', 'server.js', '8123']);
  assert.equal(args.port, 8123);
  assert.equal(args.workspace, null);
});

test('parseServerArgs rejects invalid port', () => {
  assert.throws(() => parseServerArgs(['node', 'server.js', '--port', '0']), /Invalid port/);
});

test('parseServerArgs rejects unknown options', () => {
  assert.throws(() => parseServerArgs(['node', 'server.js', '--nope']), /Unknown option/);
});

test('parseServerArgs sets help flag', () => {
  const args = parseServerArgs(['node', 'server.js', '--help']);
  assert.equal(args.help, true);
});

test('parseServerArgs sets verbose flag', () => {
  assert.equal(parseServerArgs(['node', 'server.js', '--verbose']).verbose, true);
  assert.equal(parseServerArgs(['node', 'server.js']).verbose, false);
});
