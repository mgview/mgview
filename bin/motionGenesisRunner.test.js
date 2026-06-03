const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  MAX_OUTPUT_LENGTH,
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

  let stdoutHandler = null;
  const manager = createMotionGenesisRunManager({
    environment: {
      ...process.env,
      MGVIEW_MOTION_GENESIS_BIN: '/Applications/MotionGenesis/MotionGenesis',
    },
    platform: 'darwin',
    spawnProcess() {
      return {
        pid: 1234,
        stdout: {
          on(event, handler) {
            if (event === 'data') {
              stdoutHandler = handler;
            }
          },
        },
        stderr: { on() {} },
        stdin: { on() {}, write() {} },
        on() {},
      };
    },
  });

  const started = manager.startRun({
    scenePath,
    sceneFilePath,
    simulationSettings,
    options: { autoQuit: false, autoDefaultValues: false, debug: false },
    workspaceRoot,
  });

  stdoutHandler(Buffer.from('(1) line one\r'));
  stdoutHandler(Buffer.from('\n(2) line two\r\n\n'));
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

  let stdoutHandler = null;
  const manager = createMotionGenesisRunManager({
    environment: {
      ...process.env,
      MGVIEW_MOTION_GENESIS_BIN: '/Applications/MotionGenesis/MotionGenesis',
    },
    platform: 'darwin',
    spawnProcess(command, args, options) {
      return {
        pid: 1234,
        stdout: {
          on(event, handler) {
            if (event === 'data') {
              stdoutHandler = handler;
            }
          },
        },
        stderr: { on() {} },
        stdin: { on() {}, write() {} },
        on() {},
      };
    },
  });

  const started = manager.startRun({
    scenePath,
    sceneFilePath,
    simulationSettings,
    options: { autoQuit: false, autoDefaultValues: false, debug: false },
    workspaceRoot,
  });

  stdoutHandler(Buffer.from('(1) line one\n\r\n(2) line two\r\n'));
  const current = manager.getRun(started.id);
  assert.equal(current.output, '(1) line one\n(2) line two\n');
});

test('normalizeRunOptions applies MVP defaults', () => {
  assert.deepEqual(normalizeRunOptions(), {
    autoQuit: true,
    autoDefaultValues: false,
    debug: false,
  });
  assert.deepEqual(normalizeRunOptions({ autoQuit: false, autoDefaultValues: true, debug: true }), {
    autoQuit: false,
    autoDefaultValues: true,
    debug: true,
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
    spawnProcess(command, args, options) {
      spawnCalls.push({ command, args, options });
      return {
        pid: 1234,
        stdout: { on() {} },
        stderr: { on() {} },
        stdin: { on() {}, write() {} },
        on() {},
      };
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
  assert.equal(spawnCalls[0].command, 'python3');
  assert.equal(spawnCalls[0].options.cwd, path.dirname(settingsFilePath));
  assert.equal(spawnCalls[0].args[0], path.resolve(__dirname, 'mg_pty_bridge.py'));
  assert.equal(spawnCalls[0].args[1], '/Applications/MotionGenesis/MotionGenesis');
  assert.match(
    spawnCalls[0].args[2],
    /^\.mgview-run-[0-9a-f-]+-babyboot\.txt$/
  );
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

test('runner caps stored output size', async () => {
  const workspaceRoot = makeTempWorkspace();
  const scenePath = 'project/demo.json';
  const sceneFilePath = path.join(workspaceRoot, scenePath);
  const simulationSettings = 'large-output.txt';
  const settingsFilePath = path.join(workspaceRoot, 'project', simulationSettings);

  writeFile(sceneFilePath, '{}\n');
  writeFile(
    settingsFilePath,
    `process.stdout.write('${'x'.repeat(MAX_OUTPUT_LENGTH + 500)}');`
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
  assert.equal(current.output.length, MAX_OUTPUT_LENGTH);
});

test('runner uses macOS python PTY bridge for terminal-style execution', () => {
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
      MGVIEW_PYTHON_BIN: '/custom/python3',
    },
    platform: 'darwin',
    spawnProcess(command, args, options) {
      spawned.push({ command, args, options });
      return fakeChild;
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
  assert.equal(spawned[0].command, '/custom/python3');
  assert.equal(spawned[0].args[0], path.resolve(__dirname, 'mg_pty_bridge.py'));
  assert.equal(spawned[0].args[1], '/custom/MotionGenesis');
  assert.match(spawned[0].args[2], /^\.mgview-run-.*-demo\.al$/);
  assert.deepEqual(spawned[0].options, {
    cwd: path.join(workspaceRoot, 'project'),
    env: {
      ...process.env,
      MGVIEW_MOTION_GENESIS_BIN: '/custom/MotionGenesis',
      MGVIEW_PYTHON_BIN: '/custom/python3',
    },
    stdio: 'pipe',
  });
  assert.match(
    run.commandLine,
    /^\/custom\/python3 .*mg_pty_bridge\.py \/custom\/MotionGenesis \.mgview-run-.*-demo\.al$/
  );
  assert.deepEqual(run.options, {
    autoQuit: true,
    autoDefaultValues: true,
    debug: true,
  });
  assert.match(run.output, /pty bridge enabled via python3/);
  assert.match(run.output, /temporary auto-quit input/);
  assert.equal(run.canSendInput, true);
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
      MGVIEW_PYTHON_BIN: '/custom/python3',
    },
    platform: 'darwin',
    spawnProcess(command, args, options) {
      spawned.push({ command, args, options });
      return fakeChild;
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

  assert.equal(spawned[0].args[2], 'demo.al');
  assert.equal(run.output, '');
});
