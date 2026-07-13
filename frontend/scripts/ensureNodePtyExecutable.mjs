/**
 * Ensure node-pty spawn-helper binaries are executable after npm install.
 * microsoft/node-pty often ships them as mode 644 (see node-pty#850).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  ensureNodePtySpawnHelpersExecutable,
} = require('../../bin/motionGenesisRunner.js');

const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nodePtyRoot = path.join(frontendDir, 'node_modules', 'node-pty');

if (!fs.existsSync(nodePtyRoot)) {
  process.exit(0);
}

const fixed = ensureNodePtySpawnHelpersExecutable(nodePtyRoot);
if (fixed.length > 0) {
  console.log(
    `ensureNodePtyExecutable: set +x on ${fixed.length} spawn-helper${fixed.length === 1 ? '' : 's'}`
  );
}
