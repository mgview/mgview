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

function resolveMotionGenesisLaunch(command, simulationSettings, platform, environment) {
  const resolvedPlatform = platform || process.platform;
  if (resolvedPlatform === 'darwin') {
    const spawnCommand = resolvePythonCommand(environment);
    const spawnArgs = [PTY_BRIDGE_PATH, command, simulationSettings];
    return {
      spawnCommand,
      spawnArgs,
      commandLine: [spawnCommand, ...spawnArgs].map(quoteCommandPart).join(' '),
      stdio: 'pipe',
      pty: true,
    };
  }

  return {
    spawnCommand: command,
    spawnArgs: [simulationSettings],
    commandLine: `${quoteCommandPart(command)} ${quoteCommandPart(simulationSettings)}`,
    stdio: 'pipe',
    pty: false,
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
  simulationSettings,
  command,
  commandSource,
  workingDirectory,
  options
) {
  return {
    id,
    scenePath,
    simulationSettings,
    command,
    commandLine: '',
    commandSource,
    workingDirectory,
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
  const environment = settings.environment || process.env;
  const platform = settings.platform || process.platform;
  const runs = new Map();

  function appendOutput(run, text, options) {
    if (!text) {
      return;
    }

    run.output = trimOutput(run.output + text);
    if (run.status === 'success' || run.status === 'failed') {
      return;
    }

    const chunk = options && options.rawChunk ? options.rawChunk : text;
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
    run.status = exitCode === 0 ? 'success' : 'failed';
    appendSystemOutput(
      run,
      `process exited with code ${run.exitCode === null ? 'unknown' : String(run.exitCode)}`
    );
  }

  function serializeRun(run) {
    return {
      id: run.id,
      scenePath: run.scenePath,
      simulationSettings: run.simulationSettings,
      command: run.command,
      commandLine: run.commandLine,
      commandSource: run.commandSource,
      workingDirectory: run.workingDirectory,
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

    for (const run of runs.values()) {
      if (run.scenePath === scenePath && (run.status === 'running' || run.status === 'waiting-input')) {
        throw new Error(`A Motion Genesis run is already active for ${scenePath}.`);
      }
    }

    const commandInfo = resolveMotionGenesisCommand(
      sceneDirectory,
      workspaceRoot,
      environment,
      platform
    );
    let launchSimulationSettings = simulationSettings;
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
    const child = spawnProcess(launchInfo.spawnCommand, launchInfo.spawnArgs, {
      cwd: sceneDirectory,
      env: environment,
      stdio: launchInfo.stdio,
    });

    const run = createInitialRunState(
      id,
      scenePath,
      simulationSettings,
      commandInfo.command,
      commandInfo.source,
      sceneDirectory,
      runOptions
    );
    run.child = child;
    run.pid = typeof child.pid === 'number' ? child.pid : null;
    run.commandLine = launchInfo.commandLine;
    run.tempInputFilePath = tempInputFilePath;
    runs.set(id, run);
    appendSystemOutput(run, `spawned command ${JSON.stringify(launchInfo.spawnCommand)}`);
    appendSystemOutput(run, `full command line ${JSON.stringify(run.commandLine)}`);
    appendSystemOutput(run, `working directory ${JSON.stringify(sceneDirectory)}`);
    appendSystemOutput(run, `argument ${JSON.stringify(simulationSettings)}`);
    appendSystemOutput(
      run,
      `pid ${run.pid === null ? 'unavailable' : String(run.pid)} via ${commandInfo.source}`
    );
    if (launchInfo.pty) {
      appendSystemOutput(run, 'pty bridge enabled via python3');
    }
    if (tempInputFilePath) {
      appendSystemOutput(
        run,
        `temporary auto-quit input ${JSON.stringify(path.basename(tempInputFilePath))}`
      );
    }

    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        appendOutput(run, chunk.toString('utf8'), { rawChunk: chunk.toString('utf8') });
      });
    }
    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        appendOutput(run, chunk.toString('utf8'), { rawChunk: chunk.toString('utf8') });
      });
    }
    if (child.stdin) {
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

    child.on('error', (error) => {
      appendOutput(run, `Failed to start Motion Genesis: ${error.message}\n`);
      completeRun(run, null);
      run.status = 'failed';
    });
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
      throw new Error('Motion Genesis run is not accepting input.');
    }

    run.child.stdin.write(`${String(input || '')}\n`);
    appendSystemOutput(run, `sent input ${JSON.stringify(String(input || ''))}`);
    if (run.status === 'waiting-input') {
      run.status = 'running';
    }
    return serializeRun(run);
  }

  return {
    getRun,
    resolveMotionGenesisCommand: (sceneDirectory, workspaceRoot) =>
      resolveMotionGenesisCommand(sceneDirectory, workspaceRoot, environment, platform),
    sendInput,
    startRun,
  };
}

module.exports = {
  MAX_OUTPUT_LENGTH,
  createMotionGenesisRunManager,
  normalizeRunOptions,
  resolveMotionGenesisCommand,
};
