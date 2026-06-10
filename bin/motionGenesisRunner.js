const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const childProcess = require('child_process');

const MAX_OUTPUT_LENGTH = 100000;
const PTY_BRIDGE_PATH = path.resolve(__dirname, 'mg_pty_bridge.py');

function isWithinRoot(candidatePath, rootPath) {
  const normalizedRoot = path.resolve(rootPath);
  const normalizedCandidate = path.resolve(candidatePath);
  return (
    normalizedCandidate === normalizedRoot ||
    normalizedCandidate.indexOf(normalizedRoot + path.sep) === 0
  );
}

function trimOutput(output) {
  if (output.length <= MAX_OUTPUT_LENGTH) {
    return output;
  }
  return output.slice(output.length - MAX_OUTPUT_LENGTH);
}

function normalizePtyOutput(text) {
  // Collapse PTY newline artifacts only. MG uses intentional blank lines after -> output
  // (lines ending with >), which also appear as ">\r\n\n" through the PTY.
  return String(text || '')
    .replace(/>\r\n\n/g, '>\n\n')
    .replace(/\n\r\n/g, '\n')
    .replace(/\r\n\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '');
}

function formatSystemLine(message) {
  return `[mgview ${new Date().toISOString()}] ${message}\n`;
}

function quoteCommandPart(value) {
  const text = String(value);
  if (text.length === 0) {
    return '""';
  }
  if (!/[\s"]/u.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, '\\"')}"`;
}

function defaultSpawn(command, args, options) {
  return childProcess.spawn(command, args, options);
}

function getNodePtyCandidatePaths(platform) {
  const resolvedPlatform = platform || process.platform;
  const paths = [];

  if (resolvedPlatform === 'linux') {
    paths.push(
      path.resolve(__dirname, 'node_modules', '@homebridge', 'node-pty-prebuilt-multiarch'),
      path.resolve(__dirname, '../frontend/node_modules/@homebridge/node-pty-prebuilt-multiarch'),
      '@homebridge/node-pty-prebuilt-multiarch'
    );
  }

  paths.push(
    path.resolve(__dirname, 'node_modules', 'node-pty'),
    path.resolve(__dirname, '../frontend/node_modules/node-pty'),
    'node-pty'
  );

  return paths;
}

function loadNodePty(platform) {
  const candidatePaths = getNodePtyCandidatePaths(platform);

  for (const candidatePath of candidatePaths) {
    try {
      return require(candidatePath);
    } catch (error) {
      if (error && error.code !== 'MODULE_NOT_FOUND') {
        throw error;
      }
    }
  }

  throw new Error(
    `node-pty is required for interactive Motion Genesis runs on ${platform || process.platform}. Reinstall MGView to restore the bundled PTY runtime.`
  );
}

function defaultPtySpawn(command, args, options) {
  const pty = loadNodePty(options && options.platform ? options.platform : process.platform);
  return pty.spawn(command, args, {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: options && options.cwd ? options.cwd : process.cwd(),
    env: options && options.env ? options.env : process.env,
  });
}

function resolvePythonCommand(environment) {
  const env = environment || process.env;
  const explicitPath = typeof env.MGVIEW_PYTHON_BIN === 'string'
    ? env.MGVIEW_PYTHON_BIN.trim()
    : '';
  return explicitPath.length > 0 ? explicitPath : 'python3';
}

function normalizeRunOptions(options) {
  const source = options || {};
  return {
    autoQuit: source.autoQuit !== false,
    autoDefaultValues: source.autoDefaultValues === true,
    debug: source.debug === true,
  };
}

function isLikelyMotionGenesisInputPath(filePath) {
  return /\.(al|txt|in)$/i.test(String(filePath || ''));
}

function buildAutoQuitInputFile(originalFilePath, runId) {
  const originalText = fs.readFileSync(originalFilePath, 'utf8');
  const fileName = path.basename(originalFilePath);
  const tempFileName = `.mgview-run-${runId}-${fileName}`;
  const tempFilePath = path.join(path.dirname(originalFilePath), tempFileName);
  const suffix = originalText.endsWith('\n') ? '' : '\n';
  fs.writeFileSync(tempFilePath, `${originalText}${suffix}QUIT\n`, 'utf8');
  return {
    tempFileName,
    tempFilePath,
  };
}

function resolvePtyBackend(platform, environment) {
  const resolvedPlatform = platform || process.platform;
  const env = environment || process.env;
  const explicitBackend = typeof env.MGVIEW_PTY_BACKEND === 'string'
    ? env.MGVIEW_PTY_BACKEND.trim().toLowerCase()
    : '';

  if (resolvedPlatform === 'darwin') {
    if (explicitBackend === 'python-bridge') {
      return 'python-bridge';
    }
    return 'native';
  }

  if (resolvedPlatform === 'win32' || resolvedPlatform === 'linux') {
    return 'native';
  }

  return 'pipe';
}

function resolveMotionGenesisLaunch(command, simulationSettings, platform, environment) {
  const resolvedPlatform = platform || process.platform;
  const ptyBackend = resolvePtyBackend(resolvedPlatform, environment);

  if (resolvedPlatform === 'darwin' && ptyBackend === 'python-bridge') {
    const spawnCommand = resolvePythonCommand(environment);
    const spawnArgs = [PTY_BRIDGE_PATH, command, simulationSettings];
    return {
      spawnCommand,
      spawnArgs,
      commandLine: [spawnCommand, ...spawnArgs].map(quoteCommandPart).join(' '),
      stdio: 'pipe',
      pty: true,
      nativePty: false,
      inputTerminator: '\n',
      stopSignal: 'SIGTERM',
    };
  }

  if (ptyBackend === 'native') {
    return {
      spawnCommand: command,
      spawnArgs: [simulationSettings],
      commandLine: `${quoteCommandPart(command)} ${quoteCommandPart(simulationSettings)}`,
      stdio: 'pipe',
      pty: true,
      nativePty: true,
      inputTerminator: resolvedPlatform === 'win32' ? '\r' : '\n',
      stopSignal: null,
    };
  }

  return {
    spawnCommand: command,
    spawnArgs: [simulationSettings],
    commandLine: `${quoteCommandPart(command)} ${quoteCommandPart(simulationSettings)}`,
    stdio: 'pipe',
    pty: false,
    nativePty: false,
    inputTerminator: '\n',
    stopSignal: 'SIGTERM',
  };
}

function resolveMotionGenesisCommand(sceneDirectory, workspaceRoot, environment, platform) {
  const env = environment || process.env;
  const resolvedPlatform = platform || process.platform;
  const explicitPath = typeof env.MGVIEW_MOTION_GENESIS_BIN === 'string'
    ? env.MGVIEW_MOTION_GENESIS_BIN.trim()
    : '';

  if (explicitPath.length > 0) {
    return {
      command: explicitPath,
      source: 'env',
    };
  }

  if (resolvedPlatform === 'win32') {
    return {
      command: 'C:\\MotionGenesis\\MotionGenesis',
      source: 'platform-default',
    };
  }

  if (resolvedPlatform === 'darwin') {
    return {
      command: '/Applications/MotionGenesis/MotionGenesis',
      source: 'platform-default',
    };
  }

  return {
    command: path.resolve(sceneDirectory, '../MotionGenesis'),
    source: 'scene-parent',
  };
}

function createInitialRunState(
  id,
  scenePath,
  sceneFilePath,
  simulationSettings,
  command,
  commandSource,
  workingDirectory,
  workspaceRoot,
  options
) {
  return {
    id,
    scenePath,
    sceneFilePath,
    simulationSettings,
    command,
    commandLine: '',
    commandSource,
    workingDirectory,
    workspaceRoot,
    pid: null,
    status: 'running',
    output: '',
    exitCode: null,
    startedAt: new Date().toISOString(),
    endedAt: null,
    canSendInput: true,
    inputOpen: true,
    options,
    debugEnabled: options.debug === true,
  };
}

function createMotionGenesisRunManager(options) {
  const settings = options || {};
  const spawnProcess = settings.spawnProcess || defaultSpawn;
  const spawnPtyProcess = settings.spawnPtyProcess || defaultPtySpawn;
  const environment = settings.environment || process.env;
  const platform = settings.platform || process.platform;
  const runs = new Map();

  function appendOutput(run, text, options) {
    if (!text) {
      return;
    }

    const nextOutput = run.output + text;
    run.output = trimOutput(run.pty ? normalizePtyOutput(nextOutput) : nextOutput);
    if (run.status === 'success' || run.status === 'failed') {
      return;
    }

    const rawChunk = options && options.rawChunk ? options.rawChunk : text;
    const chunk = run.pty ? normalizePtyOutput(rawChunk) : rawChunk;
    if (run.inputOpen && /[^\r\n]$/.test(chunk)) {
      run.status = 'waiting-input';
      return;
    }

    run.status = 'running';
  }

  function appendSystemOutput(run, message) {
    if (!run.debugEnabled) {
      return;
    }
    appendOutput(run, formatSystemLine(message), { rawChunk: `${message}\n` });
  }

  function completeRun(run, exitCode) {
    run.exitCode = typeof exitCode === 'number' ? exitCode : null;
    run.endedAt = new Date().toISOString();
    run.canSendInput = false;
    run.inputOpen = false;
    run.status = exitCode === 0 && run.stopRequested !== true ? 'success' : 'failed';
    appendSystemOutput(
      run,
      `process exited with code ${run.exitCode === null ? 'unknown' : String(run.exitCode)}`
    );
  }

  function serializeRun(run) {
    return {
      id: run.id,
      scenePath: run.scenePath,
      sceneFilePath: run.sceneFilePath,
      simulationSettings: run.simulationSettings,
      command: run.command,
      commandLine: run.commandLine,
      commandSource: run.commandSource,
      workingDirectory: run.workingDirectory,
      workspaceRoot: run.workspaceRoot,
      pid: run.pid,
      status: run.status,
      output: run.output,
      exitCode: run.exitCode,
      startedAt: run.startedAt,
      endedAt: run.endedAt,
      canSendInput: run.canSendInput,
      options: run.options,
    };
  }

  function attachNativePtyHandlers(run, terminal) {
    if (typeof terminal.onData === 'function') {
      terminal.onData((chunk) => {
        appendOutput(run, String(chunk || ''), { rawChunk: String(chunk || '') });
      });
    }
    if (typeof terminal.onExit === 'function') {
      terminal.onExit((event) => {
        if (run.tempInputFilePath) {
          try {
            fs.unlinkSync(run.tempInputFilePath);
            appendSystemOutput(run, `removed temporary input ${JSON.stringify(path.basename(run.tempInputFilePath))}`);
          } catch (error) {
            appendSystemOutput(run, `could not remove temporary input ${JSON.stringify(path.basename(run.tempInputFilePath))}`);
          }
        }
        completeRun(run, event && typeof event.exitCode === 'number' ? event.exitCode : null);
      });
    }
  }

  function startRun(options) {
    const scenePath = String(options.scenePath || '');
    const simulationSettings = String(options.simulationSettings || '').trim();
    const sceneFilePath = path.resolve(options.sceneFilePath);
    const workspaceRoot = path.resolve(options.workspaceRoot);
    const id = crypto.randomUUID();
    const runOptions = normalizeRunOptions(options.options);

    if (!simulationSettings) {
      throw new Error('simulationSettings is required.');
    }

    const sceneDirectory = path.dirname(sceneFilePath);
    const settingsFilePath = path.resolve(sceneDirectory, simulationSettings);

    if (!isWithinRoot(sceneFilePath, workspaceRoot) || !isWithinRoot(settingsFilePath, workspaceRoot)) {
      throw new Error('Motion Genesis files must stay within the workspace root.');
    }

    if (!fs.existsSync(sceneFilePath) || !fs.statSync(sceneFilePath).isFile()) {
      throw new Error('Scene file not found.');
    }

    if (!fs.existsSync(settingsFilePath) || !fs.statSync(settingsFilePath).isFile()) {
      throw new Error(`Motion Genesis input file not found: ${simulationSettings}`);
    }

    if (!isLikelyMotionGenesisInputPath(simulationSettings)) {
      throw new Error('simulationSettings must point to a Motion Genesis input file with a .al, .txt, or .in extension.');
    }

    for (const run of runs.values()) {
      if (run.scenePath === scenePath && (run.status === 'running' || run.status === 'waiting-input')) {
        throw new Error(`A Motion Genesis run is already active for ${scenePath}.`);
      }
    }

    const simulationDirectory = path.dirname(settingsFilePath);
    const commandInfo = resolveMotionGenesisCommand(
      simulationDirectory,
      workspaceRoot,
      environment,
      platform
    );
    let launchSimulationSettings = path.basename(settingsFilePath);
    let tempInputFilePath = null;
    if (runOptions.autoQuit) {
      const tempInput = buildAutoQuitInputFile(settingsFilePath, id);
      launchSimulationSettings = tempInput.tempFileName;
      tempInputFilePath = tempInput.tempFilePath;
    }

    const launchInfo = resolveMotionGenesisLaunch(
      commandInfo.command,
      launchSimulationSettings,
      platform,
      environment
    );
    const child = launchInfo.nativePty
      ? spawnPtyProcess(launchInfo.spawnCommand, launchInfo.spawnArgs, {
          cwd: simulationDirectory,
          env: environment,
          platform,
          stdio: launchInfo.stdio,
        })
      : spawnProcess(launchInfo.spawnCommand, launchInfo.spawnArgs, {
          cwd: simulationDirectory,
          env: environment,
          stdio: launchInfo.stdio,
        });

    const run = createInitialRunState(
      id,
      scenePath,
      sceneFilePath,
      simulationSettings,
      commandInfo.command,
      commandInfo.source,
      simulationDirectory,
      workspaceRoot,
      runOptions
    );
    run.child = child;
    run.pid = typeof child.pid === 'number' ? child.pid : null;
    run.commandLine = launchInfo.commandLine;
    run.tempInputFilePath = tempInputFilePath;
    run.pty = launchInfo.pty === true;
    run.nativePty = launchInfo.nativePty === true;
    run.inputTerminator = launchInfo.inputTerminator || '\n';
    run.stopSignal = launchInfo.stopSignal;
    runs.set(id, run);
    appendSystemOutput(run, `spawned command ${JSON.stringify(launchInfo.spawnCommand)}`);
    appendSystemOutput(run, `full command line ${JSON.stringify(run.commandLine)}`);
    appendSystemOutput(run, `working directory ${JSON.stringify(simulationDirectory)}`);
    appendSystemOutput(run, `argument ${JSON.stringify(launchSimulationSettings)}`);
    appendSystemOutput(
      run,
      `pid ${run.pid === null ? 'unavailable' : String(run.pid)} via ${commandInfo.source}`
    );
    if (launchInfo.pty) {
      appendSystemOutput(
        run,
        launchInfo.nativePty ? 'native pty enabled via node-pty' : 'pty bridge enabled via python3'
      );
    }
    if (tempInputFilePath) {
      appendSystemOutput(
        run,
        `temporary auto-quit input ${JSON.stringify(path.basename(tempInputFilePath))}`
      );
    }

    if (run.nativePty) {
      attachNativePtyHandlers(run, child);
    } else if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        appendOutput(run, chunk.toString('utf8'), { rawChunk: chunk.toString('utf8') });
      });
    }
    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        appendOutput(run, chunk.toString('utf8'), { rawChunk: chunk.toString('utf8') });
      });
    }
    if (run.nativePty) {
      appendSystemOutput(run, 'stdin is routed through the native pty');
    } else if (child.stdin) {
      child.stdin.on('error', () => {
        run.canSendInput = false;
        run.inputOpen = false;
        appendSystemOutput(run, 'stdin is no longer available');
      });
    } else {
      run.canSendInput = false;
      run.inputOpen = false;
      appendSystemOutput(run, 'stdin is unavailable for this process');
    }

    if (typeof child.on === 'function') {
      child.on('error', (error) => {
        appendOutput(run, `Failed to start Motion Genesis: ${error.message}\n`);
        completeRun(run, null);
        run.status = 'failed';
      });
      if (!run.nativePty) {
        child.on('close', (exitCode) => {
          if (run.tempInputFilePath) {
            try {
              fs.unlinkSync(run.tempInputFilePath);
              appendSystemOutput(run, `removed temporary input ${JSON.stringify(path.basename(run.tempInputFilePath))}`);
            } catch (error) {
              appendSystemOutput(run, `could not remove temporary input ${JSON.stringify(path.basename(run.tempInputFilePath))}`);
            }
          }
          completeRun(run, exitCode);
        });
      }
    }

    return serializeRun(run);
  }

  function getRun(runId) {
    const run = runs.get(String(runId || ''));
    return run ? serializeRun(run) : null;
  }

  function sendInput(runId, input) {
    const run = runs.get(String(runId || ''));
    if (!run) {
      throw new Error('Motion Genesis run not found.');
    }
    if (!run.child || !run.child.stdin || !run.canSendInput || !run.inputOpen) {
      if (!run.nativePty) {
        throw new Error('Motion Genesis run is not accepting input.');
      }
    }

    const normalizedInput = `${String(input || '')}${run.inputTerminator || '\n'}`;
    if (run.nativePty) {
      run.child.write(normalizedInput);
    } else {
      run.child.stdin.write(normalizedInput);
    }
    appendSystemOutput(run, `sent input ${JSON.stringify(String(input || ''))}`);
    if (run.status === 'waiting-input') {
      run.status = 'running';
    }
    return serializeRun(run);
  }

  function stopRun(runId) {
    const run = runs.get(String(runId || ''));
    if (!run) {
      throw new Error('Motion Genesis run not found.');
    }
    if (!run.child || run.status === 'success' || run.status === 'failed') {
      return serializeRun(run);
    }

    run.stopRequested = true;
    run.canSendInput = false;
    run.inputOpen = false;
    appendOutput(run, '\n[mgview] Stop requested by user.\n');

    try {
      if (run.nativePty) {
        run.child.kill();
      } else {
        run.child.kill(run.stopSignal || 'SIGTERM');
      }
    } catch (error) {
      throw new Error('Could not stop Motion Genesis run.');
    }

    return serializeRun(run);
  }

  return {
    getRun,
    resolveMotionGenesisCommand: (sceneDirectory, workspaceRoot) =>
      resolveMotionGenesisCommand(sceneDirectory, workspaceRoot, environment, platform),
    sendInput,
    stopRun,
    startRun,
  };
}

module.exports = {
  MAX_OUTPUT_LENGTH,
  createMotionGenesisRunManager,
  normalizePtyOutput,
  normalizeRunOptions,
  resolveMotionGenesisCommand,
};
