const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  createMotionGenesisRunManager,
  normalizePtyOutput,
  normalizeRunOptions,
  resolveMotionGenesisCommand,
} = require('./motionGenesisRunner.js');

function makeTempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mgview-motion-genesis-'));
}

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

function createFakeNativePty(overrides) {
  const settings = overrides || {};
  return {
    pid: settings.pid ?? 1234,
    onData(handler) {
      if (typeof settings.onData === 'function') {
        settings.onData(handler);
      }
    },
    onExit(handler) {
      if (typeof settings.onExit === 'function') {
        settings.onExit(handler);
      }
    },
    on(event, handler) {
      if (typeof settings.onEvent === 'function') {
        settings.onEvent(event, handler);
      }
    },
    write(value) {
      if (typeof settings.write === 'function') {
        settings.write(value);
      }
    },
    kill() {
      if (typeof settings.kill === 'function') {
        settings.kill();
      }
    },
  };
}

function spawnWrappedProcessAsPty(command, args, options) {
  const child = require('node:child_process').spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: 'pipe',
  });

  return {
    pid: child.pid,
    onData(handler) {
      child.stdout.on('data', (chunk) => handler(chunk.toString('utf8')));
      child.stderr.on('data', (chunk) => handler(chunk.toString('utf8')));
    },
    onExit(handler) {
      child.on('close', (exitCode, signal) => {
        handler({
          exitCode: typeof exitCode === 'number' ? exitCode : null,
          signal: signal || 0,
        });
      });
    },
    on(event, handler) {
      child.on(event, handler);
    },
    write(value) {
      child.stdin.write(value);
    },
    kill() {
      child.kill('SIGTERM');
    },
  };
}

test('resolveMotionGenesisCommand prefers explicit environment override', () => {
  const result = resolveMotionGenesisCommand('/tmp/project', '/tmp/workspace', {
    MGVIEW_MOTION_GENESIS_BIN: '/custom/MotionGenesis',
  }, 'darwin');
  assert.equal(result.command, '/custom/MotionGenesis');
  assert.equal(result.source, 'env');
});

test('resolveMotionGenesisCommand defaults to the macOS install location', () => {
  const result = resolveMotionGenesisCommand('/tmp/project/case1', '/tmp/workspace', {}, 'darwin');
  assert.equal(result.command, '/Applications/MotionGenesis/MotionGenesis');
  assert.equal(result.source, 'platform-default');
});

test('resolveMotionGenesisCommand defaults to the Windows install location', () => {
  const result = resolveMotionGenesisCommand('C:\\tmp\\project\\case1', 'C:\\tmp\\workspace', {}, 'win32');
  assert.equal(result.command, 'C:\\MotionGenesis\\MotionGenesis');
  assert.equal(result.source, 'platform-default');
});

test('resolveMotionGenesisCommand falls back to scene parent when no workspace root is available', () => {
  const result = resolveMotionGenesisCommand('/tmp/project/case1', null, {}, 'linux');
  assert.equal(result.command, path.resolve('/tmp/project/case1', '../MotionGenesis'));
  assert.equal(result.source, 'scene-parent');
});

test('normalizePtyOutput collapses PTY newline translation to Unix newlines', () => {
  const ptyLike = '(1) NewtonianFrame N\n\r\n(2) RigidBody A,B\n\r\n';
  const normalized = normalizePtyOutput(ptyLike);
  assert.equal(normalized, '(1) NewtonianFrame N\n(2) RigidBody A,B\n');
  assert.doesNotMatch(normalized, /\n\n/);
  assert.equal(normalizePtyOutput('line\r\n'), 'line\n');
  assert.equal(normalizePtyOutput('(1) N\r\n\n(2) B\r\n\n'), '(1) N\n(2) B\n');
  assert.equal(normalizePtyOutput('-> (15) alf\n\n   (16) B.rotate\n'), '-> (15) alf\n\n   (16) B.rotate\n');
  assert.equal(
    normalizePtyOutput("-> (15) alf_A_N> = qA''*Ax>\r\n\n   (16) B.rotate\r\n"),
    "-> (15) alf_A_N> = qA''*Ax>\n\n   (16) B.rotate\n"
  );
  assert.equal(normalizePtyOutput('-> (13) ...]\r\n-> (14) w>\r\n-> (15) alf>\r\n\n   (16)'), '-> (13) ...]\n-> (14) w>\n-> (15) alf>\n\n   (16)');
});

test('runner normalizes PTY output split across stdout chunks', () => {
  const workspaceRoot = makeTempWorkspace();
  const scenePath = 'project/demo.json';
  const sceneFilePath = path.join(workspaceRoot, scenePath);
  const simulationSettings = 'demo.txt';
  const settingsFilePath = path.join(workspaceRoot, 'project', simulationSettings);

  writeFile(sceneFilePath, '{}\n');
  writeFile(settingsFilePath, 'INPUT\n');

  let dataHandler = null;
  const manager = createMotionGenesisRunManager({
    environment: {
      ...process.env,
      MGVIEW_MOTION_GENESIS_BIN: '/Applications/MotionGenesis/MotionGenesis',
    },
    platform: 'darwin',
    spawnPtyProcess() {
      return createFakeNativePty({
        onData(handler) {
          dataHandler = handler;
        },
      });
    },
  });

  const started = manager.startRun({
    scenePath,
    sceneFilePath,
    simulationSettings,
    options: { autoQuit: false, autoDefaultValues: false, debug: false },
    workspaceRoot,
  });

  dataHandler('(1) line one\r');
  dataHandler('\n(2) line two\r\n\n');
  const current = manager.getRun(started.id);
  assert.equal(current.output, '(1) line one\n(2) line two\n');
});

test('runner normalizes PTY output chunks on macOS', async () => {
  const workspaceRoot = makeTempWorkspace();
  const scenePath = 'project/demo.json';
  const sceneFilePath = path.join(workspaceRoot, scenePath);
  const simulationSettings = 'demo.txt';
  const settingsFilePath = path.join(workspaceRoot, 'project', simulationSettings);

  writeFile(sceneFilePath, '{}\n');
  writeFile(settingsFilePath, 'INPUT\n');

  let dataHandler = null;
  const manager = createMotionGenesisRunManager({
    environment: {
      ...process.env,
      MGVIEW_MOTION_GENESIS_BIN: '/Applications/MotionGenesis/MotionGenesis',
    },
    platform: 'darwin',
    spawnPtyProcess() {
      return createFakeNativePty({
        onData(handler) {
          dataHandler = handler;
        },
      });
    },
  });

  const started = manager.startRun({
    scenePath,
    sceneFilePath,
    simulationSettings,
    options: { autoQuit: false, autoDefaultValues: false, debug: false },
    workspaceRoot,
  });

  dataHandler('(1) line one\n\r\n(2) line two\r\n');
  const current = manager.getRun(started.id);
  assert.equal(current.output, '(1) line one\n(2) line two\n');
});

test('normalizeRunOptions applies MVP defaults', () => {
  assert.deepEqual(normalizeRunOptions(), {
    autoQuit: true,
    autoDefaultValues: false,
    debug: false,
    scrollbackLimit: 0,
  });
  assert.deepEqual(normalizeRunOptions({ autoQuit: false, autoDefaultValues: true, debug: true }), {
    autoQuit: false,
    autoDefaultValues: true,
    debug: true,
    scrollbackLimit: 0,
  });
});

test('runner starts, streams output, accepts stdin, and completes successfully', async () => {
  const workspaceRoot = makeTempWorkspace();
  const scenePath = 'project/demo.json';
  const sceneFilePath = path.join(workspaceRoot, scenePath);
  const simulationSettings = 'demo-script.txt';
  const settingsFilePath = path.join(workspaceRoot, 'project', simulationSettings);

  writeFile(sceneFilePath, '{}\n');
  writeFile(
    settingsFilePath,
    [
      "process.stdout.write('Prompt: ');",
      "process.stdin.setEncoding('utf8');",
      "process.stdin.once('data', (value) => {",
      "  process.stdout.write('Received ' + value);",
      "  process.exit(0);",
      '});',
    ].join('\n')
  );

  const manager = createMotionGenesisRunManager({
    environment: {
      ...process.env,
      MGVIEW_MOTION_GENESIS_BIN: process.execPath,
    },
    platform: 'linux',
    spawnPtyProcess: spawnWrappedProcessAsPty,
  });

  const started = manager.startRun({
    scenePath,
    sceneFilePath,
    simulationSettings,
    options: {
      autoQuit: false,
      autoDefaultValues: false,
      debug: false,
    },
    workspaceRoot,
  });
  assert.equal(started.status, 'running');
  assert.equal(started.workingDirectory, path.join(workspaceRoot, 'project'));
  assert.equal(started.workspaceRoot, workspaceRoot);
  assert.equal(started.commandSource, 'env');
  assert.equal(started.commandLine, `${process.execPath} demo-script.txt`);
  assert.equal(started.sceneFilePath, sceneFilePath);
  assert.equal(typeof started.output, 'string');
  assert.equal(started.output, '');
  assert.deepEqual(started.options, {
    autoQuit: false,
    autoDefaultValues: false,
    debug: false,
    scrollbackLimit: 0,
  });

  let current = started;
  for (let index = 0; index < 30; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 20));
    current = manager.getRun(started.id);
    if (current && current.status === 'waiting-input') {
      break;
    }
  }

  assert.ok(current);
  assert.equal(current.status, 'waiting-input');
  assert.match(current.output, /Prompt:/);

  manager.sendInput(started.id, '42');

  for (let index = 0; index < 50; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 20));
    current = manager.getRun(started.id);
    if (current && (current.status === 'success' || current.status === 'failed')) {
      break;
    }
  }

  assert.ok(current);
  assert.equal(current.status, 'success');
  assert.equal(current.exitCode, 0);
  assert.equal(current.canSendInput, false);
  assert.match(current.output, /Received 42/);
  assert.doesNotMatch(current.output, /process exited with code 0/);
});

test('runner can start directly from a workspace Motion Genesis file', async () => {
  const workspaceRoot = makeTempWorkspace();
  const filePath = 'project/file-mode.txt';
  const settingsFilePath = path.join(workspaceRoot, filePath);

  writeFile(
    settingsFilePath,
    [
      "process.stdout.write('Prompt: ');",
      "process.stdin.setEncoding('utf8');",
      "process.stdin.once('data', (value) => {",
      "  process.stdout.write('Received ' + value);",
      "  process.exit(0);",
      '});',
    ].join('\n')
  );

  const manager = createMotionGenesisRunManager({
    environment: {
      ...process.env,
      MGVIEW_MOTION_GENESIS_BIN: process.execPath,
    },
    platform: 'linux',
    spawnPtyProcess: spawnWrappedProcessAsPty,
  });

  const started = manager.startFileRun({
    filePath,
    settingsFilePath,
    options: {
      autoQuit: false,
      autoDefaultValues: false,
      debug: false,
    },
    workspaceRoot,
  });

  assert.equal(started.mode, 'file');
  assert.equal(started.filePath, filePath);
  assert.equal(started.scenePath, null);
  assert.equal(started.sceneFilePath, null);
  assert.equal(started.workingDirectory, path.join(workspaceRoot, 'project'));
  assert.equal(started.commandLine, `${process.execPath} file-mode.txt`);

  let current = started;
  for (let index = 0; index < 30; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 20));
    current = manager.getRun(started.id);
    if (current && current.status === 'waiting-input') {
      break;
    }
  }

  assert.ok(current);
  assert.equal(current.status, 'waiting-input');
  manager.sendInput(started.id, '17');

  for (let index = 0; index < 50; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 20));
    current = manager.getRun(started.id);
    if (current && current.status === 'success') {
      break;
    }
  }

  assert.ok(current);
  assert.equal(current.status, 'success');
  assert.match(current.output, /Received 17/);
});

test('runner reuses an existing active file-based run instead of throwing', () => {
  const workspaceRoot = makeTempWorkspace();
  const filePath = 'project/reuse.txt';
  const settingsFilePath = path.join(workspaceRoot, filePath);

  writeFile(settingsFilePath, "process.stdout.write('Prompt: '); setInterval(() => {}, 1000);");

  const manager = createMotionGenesisRunManager({
    environment: {
      ...process.env,
      MGVIEW_MOTION_GENESIS_BIN: process.execPath,
    },
    platform: 'linux',
    spawnPtyProcess: spawnWrappedProcessAsPty,
  });

  const started = manager.startFileRun({
    filePath,
    settingsFilePath,
    options: {
      autoQuit: false,
      autoDefaultValues: false,
      debug: false,
    },
    workspaceRoot,
  });

  const reused = manager.startFileRun({
    filePath,
    settingsFilePath,
    options: {
      autoQuit: false,
      autoDefaultValues: false,
      debug: false,
    },
    workspaceRoot,
  });

  assert.equal(reused.id, started.id);
  manager.stopRun(started.id);
});

test('runner rejects scene json files as simulationSettings', () => {
  const workspaceRoot = makeTempWorkspace();
  const scenePath = 'project/demo.json';
  const sceneFilePath = path.join(workspaceRoot, scenePath);
  const simulationSettings = 'demo.json';
  const settingsFilePath = path.join(workspaceRoot, 'project', simulationSettings);

  writeFile(sceneFilePath, '{}\n');
  writeFile(settingsFilePath, '{}\n');

  const manager = createMotionGenesisRunManager({
    environment: {
      ...process.env,
      MGVIEW_MOTION_GENESIS_BIN: process.execPath,
    },
    platform: 'linux',
    spawnPtyProcess: spawnWrappedProcessAsPty,
  });

  assert.throws(
    () => {
      manager.startRun({
        scenePath,
        sceneFilePath,
        simulationSettings,
        options: {
          autoQuit: false,
          autoDefaultValues: false,
          debug: false,
        },
        workspaceRoot,
      });
    },
    /simulationSettings must point to a Motion Genesis input file with a \.al, \.txt, or \.in extension\./
  );
});

test('runner accepts blank stdin lines for default-value prompts', async () => {
  const workspaceRoot = makeTempWorkspace();
  const scenePath = 'project/demo.json';
  const sceneFilePath = path.join(workspaceRoot, scenePath);
  const simulationSettings = 'blank-line.txt';
  const settingsFilePath = path.join(workspaceRoot, 'project', simulationSettings);

  writeFile(sceneFilePath, '{}\n');
  writeFile(
    settingsFilePath,
    [
      "process.stdin.setEncoding('utf8');",
      "process.stdout.write('Enter value: ');",
      "process.stdin.once('data', (value) => {",
      "  process.stdout.write(JSON.stringify(value));",
      "  process.exit(0);",
      '});',
    ].join('\n')
  );

  const manager = createMotionGenesisRunManager({
    environment: {
      ...process.env,
      MGVIEW_MOTION_GENESIS_BIN: process.execPath,
    },
    platform: 'linux',
    spawnPtyProcess: spawnWrappedProcessAsPty,
  });

  const started = manager.startRun({
    scenePath,
    sceneFilePath,
    simulationSettings,
    options: {
      autoQuit: false,
      autoDefaultValues: false,
      debug: false,
    },
    workspaceRoot,
  });

  let current = started;
  for (let index = 0; index < 30; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 20));
    current = manager.getRun(started.id);
    if (current && current.status === 'waiting-input') {
      break;
    }
  }

  assert.ok(current);
  assert.equal(current.status, 'waiting-input');
  manager.sendInput(started.id, '');

  for (let index = 0; index < 50; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 20));
    current = manager.getRun(started.id);
    if (current && current.status === 'success') {
      break;
    }
  }

  assert.ok(current);
  assert.equal(current.status, 'success');
  assert.match(current.output, /"\\n"/);
});

test('runner preserves relative input directories when auto-quit is enabled on macOS', () => {
  const workspaceRoot = makeTempWorkspace();
  const scenePath = 'sims/babyboot/chaotic/babyboot.json';
  const sceneFilePath = path.join(workspaceRoot, scenePath);
  const simulationSettings = '../babyboot.txt';
  const settingsFilePath = path.join(workspaceRoot, 'sims', 'babyboot', 'babyboot.txt');
  const spawnCalls = [];

  writeFile(sceneFilePath, '{}\n');
  writeFile(settingsFilePath, 'INPUT\n');

  const manager = createMotionGenesisRunManager({
    environment: {
      ...process.env,
      MGVIEW_MOTION_GENESIS_BIN: '/Applications/MotionGenesis/MotionGenesis',
    },
    platform: 'darwin',
    spawnPtyProcess(command, args, options) {
      spawnCalls.push({ command, args, options });
      return createFakeNativePty();
    },
  });

  const started = manager.startRun({
    scenePath,
    sceneFilePath,
    simulationSettings,
    options: {
      autoQuit: true,
      autoDefaultValues: false,
      debug: false,
    },
    workspaceRoot,
  });

  assert.equal(spawnCalls.length, 1);
  assert.equal(spawnCalls[0].command, '/Applications/MotionGenesis/MotionGenesis');
  assert.equal(spawnCalls[0].options.cwd, path.dirname(settingsFilePath));
  assert.equal(spawnCalls[0].options.platform, 'darwin');
  assert.match(spawnCalls[0].args[0], /^\.mgview-run-[0-9a-f-]+-babyboot\.txt$/);
  assert.match(
    started.commandLine,
     / \.mgview-run-[0-9a-f-]+-babyboot\.txt$/
  );
  assert.equal(started.workingDirectory, path.dirname(settingsFilePath));
});

test('runner rejects simulationSettings that escape the workspace', () => {
  const workspaceRoot = makeTempWorkspace();
  const sceneFilePath = path.join(workspaceRoot, 'project', 'demo.json');
  writeFile(sceneFilePath, '{}\n');

  const manager = createMotionGenesisRunManager({
    environment: {
      ...process.env,
      MGVIEW_MOTION_GENESIS_BIN: process.execPath,
    },
    platform: 'linux',
  });

  assert.throws(
    () =>
      manager.startRun({
        scenePath: 'project/demo.json',
        sceneFilePath,
        simulationSettings: '../../outside.js',
        workspaceRoot,
      }),
    /workspace root/
  );
});

test('runner rejects file-based runs that escape the workspace', () => {
  const workspaceRoot = makeTempWorkspace();
  const manager = createMotionGenesisRunManager({
    environment: {
      ...process.env,
      MGVIEW_MOTION_GENESIS_BIN: process.execPath,
    },
    platform: 'linux',
  });

  assert.throws(
    () =>
      manager.startFileRun({
        filePath: '../../outside.txt',
        settingsFilePath: path.join(workspaceRoot, '..', 'outside.txt'),
        workspaceRoot,
      }),
    /workspace root/
  );
});

test('runner keeps full output when scrollback is unlimited', async () => {
  const workspaceRoot = makeTempWorkspace();
  const scenePath = 'project/demo.json';
  const sceneFilePath = path.join(workspaceRoot, scenePath);
  const simulationSettings = 'large-output.txt';
  const settingsFilePath = path.join(workspaceRoot, 'project', simulationSettings);
  const fullLineCount = 600;

  writeFile(sceneFilePath, '{}\n');
  writeFile(
    settingsFilePath,
    `process.stdout.write(${JSON.stringify(Array.from({ length: fullLineCount }, (_, index) => `line-${index}`).join('\n') + '\n')});`
  );

  const manager = createMotionGenesisRunManager({
    environment: {
      ...process.env,
      MGVIEW_MOTION_GENESIS_BIN: process.execPath,
    },
    platform: 'linux',
  });

  const started = manager.startRun({
    scenePath,
    sceneFilePath,
    simulationSettings,
    options: {
      autoQuit: false,
      autoDefaultValues: false,
      debug: false,
      scrollbackLimit: 0,
    },
    workspaceRoot,
  });

  let current = started;
  for (let index = 0; index < 50; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 20));
    current = manager.getRun(started.id);
    if (current && (current.status === 'success' || current.status === 'failed')) {
      break;
    }
  }

  assert.ok(current);
  assert.equal(current.status, 'success');
  assert.equal(current.output.split('\n').length - 1, fullLineCount);
});

test('runner caps stored output size by line count when scrollbackLimit is configured', async () => {
  const workspaceRoot = makeTempWorkspace();
  const scenePath = 'project/demo.json';
  const sceneFilePath = path.join(workspaceRoot, scenePath);
  const simulationSettings = 'large-output-capped.txt';
  const settingsFilePath = path.join(workspaceRoot, 'project', simulationSettings);
  const scrollbackLimit = 25;
  const fullLineCount = scrollbackLimit + 10;

  writeFile(sceneFilePath, '{}\n');
  writeFile(
    settingsFilePath,
    `process.stdout.write(${JSON.stringify(Array.from({ length: fullLineCount }, (_, index) => `line-${index}`).join('\n') + '\n')});`
  );

  const manager = createMotionGenesisRunManager({
    environment: {
      ...process.env,
      MGVIEW_MOTION_GENESIS_BIN: process.execPath,
    },
    platform: 'linux',
  });

  const started = manager.startRun({
    scenePath,
    sceneFilePath,
    simulationSettings,
    options: {
      autoQuit: false,
      autoDefaultValues: false,
      debug: false,
      scrollbackLimit,
    },
    workspaceRoot,
  });

  let current = started;
  for (let index = 0; index < 50; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 20));
    current = manager.getRun(started.id);
    if (current && (current.status === 'success' || current.status === 'failed')) {
      break;
    }
  }

  assert.ok(current);
  assert.equal(current.status, 'success');
  assert.equal(current.output.split('\n').length - 1, scrollbackLimit);
  assert.match(current.output, /line-10/);
  assert.doesNotMatch(current.output, /line-0/);
});

test('runner uses native macOS PTY execution by default', () => {
  const spawned = [];

  const manager = createMotionGenesisRunManager({
    environment: {
      ...process.env,
      MGVIEW_MOTION_GENESIS_BIN: '/custom/MotionGenesis',
    },
    platform: 'darwin',
    spawnPtyProcess(command, args, options) {
      spawned.push({ command, args, options });
      return createFakeNativePty({ pid: 123 });
    },
  });

  const workspaceRoot = makeTempWorkspace();
  const sceneFilePath = path.join(workspaceRoot, 'project', 'demo.json');
  const settingsFilePath = path.join(workspaceRoot, 'project', 'demo.al');
  writeFile(sceneFilePath, '{}\n');
  writeFile(settingsFilePath, '% demo\n');

  const run = manager.startRun({
    scenePath: 'project/demo.json',
    sceneFilePath,
    simulationSettings: 'demo.al',
    options: {
      autoQuit: true,
      autoDefaultValues: true,
      debug: true,
    },
    workspaceRoot,
  });

  assert.equal(spawned.length, 1);
  assert.equal(spawned[0].command, '/custom/MotionGenesis');
  assert.match(spawned[0].args[0], /^\.mgview-run-.*-demo\.al$/);
  assert.deepEqual(spawned[0].options, {
    cwd: path.join(workspaceRoot, 'project'),
    env: {
      ...process.env,
      MGVIEW_MOTION_GENESIS_BIN: '/custom/MotionGenesis',
    },
    platform: 'darwin',
    stdio: 'pipe',
  });
  assert.match(run.commandLine, /^\/custom\/MotionGenesis \.mgview-run-.*-demo\.al$/);
  assert.deepEqual(run.options, {
    autoQuit: true,
    autoDefaultValues: true,
    debug: true,
    scrollbackLimit: 0,
  });
  assert.match(run.output, /native pty enabled via node-pty/);
  assert.match(run.output, /temporary auto-quit input/);
  assert.equal(run.canSendInput, true);
});

test('runner can still use the macOS python PTY bridge when explicitly requested', () => {
  const spawned = [];

  const manager = createMotionGenesisRunManager({
    environment: {
      ...process.env,
      MGVIEW_MOTION_GENESIS_BIN: '/custom/MotionGenesis',
      MGVIEW_PYTHON_BIN: '/custom/python3',
      MGVIEW_PTY_BACKEND: 'python-bridge',
    },
    platform: 'darwin',
    spawnProcess(command, args, options) {
      spawned.push({ command, args, options });
      return {
        pid: 123,
        stdout: { on() {} },
        stderr: { on() {} },
        stdin: { on() {}, write() {} },
        on() {},
      };
    },
  });

  const workspaceRoot = makeTempWorkspace();
  const sceneFilePath = path.join(workspaceRoot, 'project', 'demo.json');
  const settingsFilePath = path.join(workspaceRoot, 'project', 'demo.al');
  writeFile(sceneFilePath, '{}\n');
  writeFile(settingsFilePath, '% demo\n');

  const run = manager.startRun({
    scenePath: 'project/demo.json',
    sceneFilePath,
    simulationSettings: 'demo.al',
    options: {
      autoQuit: false,
      autoDefaultValues: false,
      debug: true,
    },
    workspaceRoot,
  });

  assert.equal(spawned.length, 1);
  assert.equal(spawned[0].command, '/custom/python3');
  assert.equal(spawned[0].args[0], path.resolve(__dirname, 'mg_pty_bridge.py'));
  assert.equal(spawned[0].args[1], '/custom/MotionGenesis');
  assert.equal(spawned[0].args[2], 'demo.al');
  assert.match(run.output, /pty bridge enabled via python3/);
});

test('runner uses native Windows PTY execution for interactive sessions', () => {
  const spawned = [];
  let dataHandler = null;
  let exitHandler = null;
  let errorHandler = null;
  const writes = [];
  let killed = false;

  const manager = createMotionGenesisRunManager({
    environment: {
      ...process.env,
      MGVIEW_MOTION_GENESIS_BIN: 'C:\\MotionGenesis\\MotionGenesis',
    },
    platform: 'win32',
    spawnPtyProcess(command, args, options) {
      spawned.push({ command, args, options });
      return {
        pid: 4321,
        onData(handler) {
          dataHandler = handler;
        },
        onExit(handler) {
          exitHandler = handler;
        },
        on(event, handler) {
          if (event === 'error') {
            errorHandler = handler;
          }
        },
        write(value) {
          writes.push(value);
        },
        kill() {
          killed = true;
        },
      };
    },
  });

  const workspaceRoot = makeTempWorkspace();
  const sceneFilePath = path.join(workspaceRoot, 'project', 'demo.json');
  const settingsFilePath = path.join(workspaceRoot, 'project', 'demo.al');
  writeFile(sceneFilePath, '{}\n');
  writeFile(settingsFilePath, '% demo\n');

  const run = manager.startRun({
    scenePath: 'project/demo.json',
    sceneFilePath,
    simulationSettings: 'demo.al',
    options: {
      autoQuit: false,
      autoDefaultValues: false,
      debug: true,
    },
    workspaceRoot,
  });

  assert.equal(spawned.length, 1);
  assert.equal(spawned[0].command, 'C:\\MotionGenesis\\MotionGenesis');
  assert.deepEqual(spawned[0].args, ['demo.al']);
  assert.deepEqual(spawned[0].options, {
    cwd: path.join(workspaceRoot, 'project'),
    env: {
      ...process.env,
      MGVIEW_MOTION_GENESIS_BIN: 'C:\\MotionGenesis\\MotionGenesis',
    },
    platform: 'win32',
    stdio: 'pipe',
  });
  assert.equal(typeof errorHandler, 'function');
  assert.match(run.output, /native pty enabled via node-pty/);

  dataHandler('Prompt: ');
  let current = manager.getRun(run.id);
  assert.equal(current.status, 'waiting-input');

  manager.sendInput(run.id, '42');
  assert.deepEqual(writes, ['42\r']);
  current = manager.getRun(run.id);
  assert.equal(current.status, 'running');

  dataHandler('Received 42\r\n');
  exitHandler({ exitCode: 0, signal: 0 });
  current = manager.getRun(run.id);
  assert.equal(current.status, 'success');
  assert.match(current.output, /Received 42/);

  const stopped = manager.stopRun(run.id);
  assert.equal(stopped.status, 'success');
  assert.equal(killed, false);
});

test('runner uses native Linux PTY execution with prebuilt binaries', () => {
  const spawned = [];

  const manager = createMotionGenesisRunManager({
    environment: {
      ...process.env,
      MGVIEW_MOTION_GENESIS_BIN: '/custom/MotionGenesis',
    },
    platform: 'linux',
    spawnPtyProcess(command, args, options) {
      spawned.push({ command, args, options });
      return createFakeNativePty({ pid: 6789 });
    },
  });

  const workspaceRoot = makeTempWorkspace();
  const sceneFilePath = path.join(workspaceRoot, 'project', 'demo.json');
  const settingsFilePath = path.join(workspaceRoot, 'project', 'demo.al');
  writeFile(sceneFilePath, '{}\n');
  writeFile(settingsFilePath, '% demo\n');

  const run = manager.startRun({
    scenePath: 'project/demo.json',
    sceneFilePath,
    simulationSettings: 'demo.al',
    options: {
      autoQuit: false,
      autoDefaultValues: false,
      debug: true,
    },
    workspaceRoot,
  });

  assert.equal(spawned.length, 1);
  assert.equal(spawned[0].command, '/custom/MotionGenesis');
  assert.deepEqual(spawned[0].args, ['demo.al']);
  assert.deepEqual(spawned[0].options, {
    cwd: path.join(workspaceRoot, 'project'),
    env: {
      ...process.env,
      MGVIEW_MOTION_GENESIS_BIN: '/custom/MotionGenesis',
    },
    platform: 'linux',
    stdio: 'pipe',
  });
  assert.match(run.output, /native pty enabled via node-pty/);
});

test('runner can stop an active run', async () => {
  const workspaceRoot = makeTempWorkspace();
  const scenePath = 'project/demo.json';
  const sceneFilePath = path.join(workspaceRoot, scenePath);
  const simulationSettings = 'waiting.txt';
  const settingsFilePath = path.join(workspaceRoot, 'project', simulationSettings);

  writeFile(sceneFilePath, '{}\n');
  writeFile(
    settingsFilePath,
    [
      "process.stdout.write('Waiting...');",
      'setInterval(() => {}, 1000);',
    ].join('\n')
  );

  const manager = createMotionGenesisRunManager({
    environment: {
      ...process.env,
      MGVIEW_MOTION_GENESIS_BIN: process.execPath,
    },
    platform: 'linux',
    spawnPtyProcess: spawnWrappedProcessAsPty,
  });

  const started = manager.startRun({
    scenePath,
    sceneFilePath,
    simulationSettings,
    options: {
      autoQuit: false,
      autoDefaultValues: false,
      debug: false,
    },
    workspaceRoot,
  });

  let current = started;
  for (let index = 0; index < 30; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 20));
    current = manager.getRun(started.id);
    if (current && current.status === 'waiting-input') {
      break;
    }
  }

  assert.ok(current);
  const stopped = manager.stopRun(started.id);
  assert.equal(stopped.canSendInput, false);
  assert.match(stopped.output, /Stop requested by user/);

  for (let index = 0; index < 50; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 20));
    current = manager.getRun(started.id);
    if (current && current.status === 'failed') {
      break;
    }
  }

  assert.ok(current);
  assert.equal(current.status, 'failed');
  assert.equal(current.canSendInput, false);
});

test('runner skips auto-quit temp file when option is disabled', () => {
  const spawned = [];
  const fakeChild = {
    pid: 123,
    stdout: { on() {} },
    stderr: { on() {} },
    stdin: { on() {}, write() {} },
    on() {},
  };

  const manager = createMotionGenesisRunManager({
    environment: {
      ...process.env,
      MGVIEW_MOTION_GENESIS_BIN: '/custom/MotionGenesis',
    },
    platform: 'darwin',
    spawnPtyProcess(command, args, options) {
      spawned.push({ command, args, options });
      return createFakeNativePty({ pid: 123 });
    },
  });

  const workspaceRoot = makeTempWorkspace();
  const sceneFilePath = path.join(workspaceRoot, 'project', 'demo.json');
  const settingsFilePath = path.join(workspaceRoot, 'project', 'demo.al');
  writeFile(sceneFilePath, '{}\n');
  writeFile(settingsFilePath, '% demo\n');

  const run = manager.startRun({
    scenePath: 'project/demo.json',
    sceneFilePath,
    simulationSettings: 'demo.al',
    options: {
      autoQuit: false,
      autoDefaultValues: false,
      debug: false,
    },
    workspaceRoot,
  });

  assert.equal(spawned[0].args[0], 'demo.al');
  assert.equal(run.output, '');
});
