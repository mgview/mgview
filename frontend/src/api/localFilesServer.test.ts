import assert from 'node:assert/strict';
import test from 'node:test';

import { startMotionGenesisFileRun, stopMotionGenesisRun } from './localFilesServer.ts';

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

test('startMotionGenesisFileRun targets the file-run endpoint', async () => {
  let requestedUrl = '';

  globalThis.window = {
    location: {
      origin: 'http://localhost:8000',
    },
  } as Window & typeof globalThis;

  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return new Response(
      JSON.stringify({
        id: 'run-123',
        mode: 'file',
        filePath: 'project/demo.al',
        scenePath: null,
        sceneFilePath: null,
        simulationSettings: 'project/demo.al',
        command: '/Applications/MotionGenesis/MotionGenesis',
        commandLine: '/Applications/MotionGenesis/MotionGenesis demo.al',
        commandSource: 'platform-default',
        workingDirectory: '/tmp/project',
        workspaceRoot: '/tmp',
        pid: 123,
        status: 'running',
        output: '',
        exitCode: null,
        startedAt: '2026-01-01T00:00:00.000Z',
        endedAt: null,
        canSendInput: true,
        options: {
          autoQuit: true,
          autoDefaultValues: false,
          debug: false,
        },
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  };

  const run = await startMotionGenesisFileRun('project/demo.al', {
    autoQuit: true,
    autoDefaultValues: false,
    debug: false,
  });

  assert.match(requestedUrl, /\/mgview\/api\/mg-run-file$/);
  assert.equal(run.mode, 'file');
  assert.equal(run.filePath, 'project/demo.al');
});
