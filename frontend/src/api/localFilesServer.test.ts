import assert from 'node:assert/strict';
import test from 'node:test';

import { stopMotionGenesisRun } from './localFilesServer.ts';

test('stopMotionGenesisRun falls back to a readable error when the server returns an empty non-JSON error body', async () => {
  globalThis.window = {
    location: {
      origin: 'http://localhost:8000',
    },
  } as Window & typeof globalThis;

  globalThis.fetch = async () =>
    new Response('', {
      status: 501,
      statusText: 'Not Implemented',
    });

  await assert.rejects(
    () => stopMotionGenesisRun('run-123'),
    /Could not stop Motion Genesis run run-123/
  );
});
