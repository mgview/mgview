import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseArgs } from './cleanupServers.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(scriptDir, 'cleanupServers.mjs');

function runCleanup(args) {
  return execSync(`node ${scriptPath} ${args}`, { encoding: 'utf8' });
}

test('cleanup:servers defaults to dry run', () => {
  const output = runCleanup('');
  assert.match(output, /Dry run only|No orphaned/);
});

test('cleanup:servers rejects unknown flags', () => {
  assert.throws(() => parseArgs(['--nope']), /Unknown option/);
});
