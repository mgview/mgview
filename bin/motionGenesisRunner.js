const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const childProcess = require('child_process');
const { readMotionGenesisBinFromConfig } = require('./workspaceRoots.js');

const PTY_BRIDGE_PATH = path.resolve(__dirname, 'mg_pty_bridge.py');
const DEFAULT_PTY_COLS = 80;
const DEFAULT_PTY_ROWS = 30;

function isWithinRoot(candidatePath, rootPath) {
  const normalizedRoot = path.resolve(rootPath);
  const normalizedCandidate = path.resolve(candidatePath);
  return (
    normalizedCandidate === normalizedRoot ||
    normalizedCandidate.indexOf(normalizedRoot + path.sep) === 0
  );
}

function toWorkspaceRelativePath(filePath, workspaceRoot) {
  return path.relative(path.resolve(workspaceRoot), path.resolve(filePath)).replace(/\\/g, '/');
}

function detectOdeOutputPathsFromSimText(text) {
  const results = new Set();

  for (const line of String(text).split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('%')) {
      continue;
    }

    const match = trimmed.match(/^ODE\s*\([^)]*\)\s*(.*)$/i);
    if (!match) {
      continue;
    }

    const tail = (match[1] || '').trim();
    if (tail.length === 0) {
      results.add('Data');
      continue;
    }

    const firstToken = tail.split(/\s+/)[0];
    if (firstToken) {
      results.add(firstToken);
    }
  }

  return [...results];
}

function ensureOdeOutputDirectories(simulationDirectory, workspaceRoot, odeOutputPaths) {
  const directories = new Set();

  for (const outputPath of odeOutputPaths) {
    const normalized = String(outputPath).replace(/\\/g, '/');
    const slashIndex = normalized.lastIndexOf('/');
    if (slashIndex <= 0) {
      continue;
    }

    const relativeDir = normalized.slice(0, slashIndex);
    if (relativeDir.length > 0 && relativeDir !== '.') {
      directories.add(relativeDir);
    }
  }

  for (const relativeDir of directories) {
    const resolvedDirectory = path.resolve(simulationDirectory, relativeDir);
    if (!isWithinRoot(resolvedDirectory, workspaceRoot)) {
      throw new Error(`ODE output directory is outside the workspace: ${relativeDir}`);
    }

    fs.mkdirSync(resolvedDirectory, { recursive: true });
  }
}

function trimOutput(output, limit) {
  if (!Number.isFinite(limit) || limit <= 0 || output.length === 0) {
    return output;
  }

  const lines = output.split('\n');
  if (lines.length <= limit + 1) {
    return output;
  }

  return lines.slice(lines.length - (limit + 1)).join('\n');
}

function stripTerminalControlSequences(text) {
  return String(text || '')
    // Absolute cursor moves (CUP/HVP) and line positioning become line breaks in plain text.
    .replace(/\u001b\[(\d+)(?:;(\d+))?[Hf]/g, '\n')
    .replace(/\u001b\[(\d+)d/g, '\n')
    // OSC (Operating System Command), e.g. terminal window title updates.
    .replace(/\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)/g, '')
    // DCS (Device Control String).
    .replace(/\u001bP[\s\S]*?\u001b\\/g, '')
    // CSI sequences (cursor movement, color, private mode toggles, etc).
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '')
    // Two-character escape sequences.
    .replace(/\u001b[@-_]/g, '')
    // C0 controls except newline, carriage return, and tab.
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

function findWrapOverlap(previous, next) {
  const limit = Math.min(previous.length, next.length, 32);
  for (let size = limit; size > 0; size -= 1) {
    if (previous.slice(-size) === next.slice(0, size)) {
      return size;
    }
  }
  return 0;
}

function isMgPromptLine(line) {
  return /^\s*(?:->\s*)?\(\d+\)/.test(line);
}

function isMgStaticScreenLine(line) {
  const text = String(line || '');
  const trimmed = text.trim();
  if (/^██/.test(text)) {
    return true;
  }
  if (/^█{10,}$/.test(trimmed)) {
    return true;
  }
  // macOS MotionGenesis banners use '+' borders instead of solid blocks.
  if (/^\+\+/.test(text)) {
    return true;
  }
  if (/^\+{10,}$/.test(trimmed)) {
    return true;
  }
  if (/^[-=]{10,}$/.test(trimmed)) {
    return true;
  }
  if (/^Note:\b/.test(trimmed)) {
    return true;
  }
  if (/^Type (QUIT|HELP|PLOT)\b/.test(trimmed)) {
    return true;
  }
  return false;
}

function canContinueWrappedLine(line, nextLine) {
  return (
    typeof nextLine === 'string' &&
    nextLine.length > 0 &&
    !isMgPromptLine(nextLine) &&
    !isMgStaticScreenLine(line) &&
    !isMgStaticScreenLine(nextLine)
  );
}

function isFullTerminalRow(line, cols) {
  return Number.isFinite(cols) && cols > 0 && line.length >= cols - 1 && line.length <= cols + 1;
}

function shouldMergeWrappedLine(line, nextLine, cols) {
  if (!canContinueWrappedLine(line, nextLine)) {
    return false;
  }

  const overlap = findWrapOverlap(line, nextLine);
  if (overlap >= 2) {
    return true;
  }

  if (!isFullTerminalRow(line, cols)) {
    return false;
  }

  return true;
}

function mergeWrappedLine(line, nextLine, cols) {
  const overlap = findWrapOverlap(line, nextLine);
  if (overlap > 0) {
    return line + nextLine.slice(overlap);
  }
  return line + nextLine;
}

function unwrapSoftWrappedLines(text, terminalColumns) {
  const cols = Number(terminalColumns);
  const lines = String(text || '').split('\n');
  if (lines.length < 2) {
    return String(text || '');
  }

  const mergedLines = [];
  for (let index = 0; index < lines.length; index += 1) {
    let line = lines[index];

    while (index + 1 < lines.length) {
      const nextLine = lines[index + 1];
      if (!shouldMergeWrappedLine(line, nextLine, cols)) {
        break;
      }

      line = mergeWrappedLine(line, nextLine, cols);
      index += 1;
    }

    mergedLines.push(line);
  }

  return mergedLines.join('\n');
}

function normalizePtyOutput(text, terminalColumns) {
  // Collapse PTY newline artifacts only. MG uses intentional blank lines after -> output
  // (lines ending with >), which also appear as ">\r\n\n" through the PTY.
  return unwrapSoftWrappedLines(
    stripTerminalControlSequences(text)
    .replace(/>\r\n\n/g, '>\n\n')
    .replace(/\n\r\n/g, '\n')
    .replace(/\r\n\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, ''),
    terminalColumns
  );
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

const PTY_MODULE_NAME = '@homebridge/node-pty-prebuilt-multiarch';

function getNodePtyCandidatePaths() {
  return [
    path.resolve(__dirname, 'node_modules', '@homebridge', 'node-pty-prebuilt-multiarch'),
    path.resolve(__dirname, '../frontend/node_modules/@homebridge/node-pty-prebuilt-multiarch'),
    PTY_MODULE_NAME,
  ];
}

function formatNodePtyLoadError(platform, attempts) {
  const lines = [
    `Interactive Motion Genesis runs on ${platform || process.platform} require ${PTY_MODULE_NAME}.`,
    `Node.js ${process.version}.`,
    'Module load attempts:',
    ...attempts.map((attempt) => `  - ${attempt.path}: ${attempt.error}`),
    'Dev setup: cd frontend && npm install',
    'Release bundles this module under bin/node_modules/.',
    'Node.js 24 requires @homebridge/node-pty-prebuilt-multiarch >= 0.13.1.',
  ];
  return lines.join('\n');
}

function inspectNodePtyLoad(platform) {
  const attempts = [];

  for (const candidatePath of getNodePtyCandidatePaths()) {
    try {
      require(candidatePath);
      return {
        ptyAvailable: true,
        ptyError: null,
        requiredModule: PTY_MODULE_NAME,
        resolvedModulePath: candidatePath,
        loadAttempts: attempts.concat({
          path: candidatePath,
          ok: true,
          error: null,
        }),
      };
    } catch (error) {
      attempts.push({
        path: candidatePath,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    ptyAvailable: false,
    ptyError: formatNodePtyLoadError(platform, attempts),
    requiredModule: PTY_MODULE_NAME,
    resolvedModulePath: null,
    loadAttempts: attempts,
  };
}

function loadNodePty(platform) {
  const inspection = inspectNodePtyLoad(platform);
  if (!inspection.ptyAvailable || !inspection.resolvedModulePath) {
    throw new Error(inspection.ptyError || `Could not load ${PTY_MODULE_NAME}.`);
  }

  return require(inspection.resolvedModulePath);
}

function assertInteractivePtyAvailable(platform, environment) {
  const resolvedPlatform = platform || process.platform;
  const ptyBackend = resolvePtyBackend(resolvedPlatform, environment);
  if (ptyBackend !== 'native') {
    return;
  }

  loadNodePty(resolvedPlatform);
}

function defaultPtySpawn(command, args, options) {
  const pty = loadNodePty(options && options.platform ? options.platform : process.platform);
  const requestedCols = Number(options && options.cols);
  const requestedRows = Number(options && options.rows);
  const cols = Number.isFinite(requestedCols) && requestedCols > 0 ? Math.floor(requestedCols) : DEFAULT_PTY_COLS;
  const rows = Number.isFinite(requestedRows) && requestedRows > 0 ? Math.floor(requestedRows) : DEFAULT_PTY_ROWS;
  return pty.spawn(command, args, {
    name: 'xterm-color',
    cols,
    rows,
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
  const rawScrollbackLimit = Number(source.scrollbackLimit);
  const scrollbackLimit = Number.isFinite(rawScrollbackLimit) && rawScrollbackLimit >= 0
    ? Math.floor(rawScrollbackLimit)
    : 0;
  return {
    autoQuit: source.autoQuit !== false,
    autoDefaultValues: source.autoDefaultValues === true,
    debug: source.debug === true,
    scrollbackLimit,
  };
}

function isLikelyMotionGenesisInputPath(filePath) {
  return /\.(al|txt)$/i.test(String(filePath || ''));
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

  throw new Error(
    `Interactive Motion Genesis runs are not configured for platform ${resolvedPlatform}. ` +
      'Supported platforms use native PTY execution, or macOS python-bridge when MGVIEW_PTY_BACKEND=python-bridge.'
  );
}

function getMotionGenesisCommandCandidates(environment, platform) {
  const env = environment || process.env;
  const resolvedPlatform = platform || process.platform;
  const homeDirectory =
    (typeof env.USERPROFILE === 'string' && env.USERPROFILE.trim()) ||
    (typeof env.HOME === 'string' && env.HOME.trim()) ||
    '';
  const candidateCommands = [];

  if (resolvedPlatform === 'win32') {
    candidateCommands.push(
      'C:\\MotionGenesis\\MotionGenesis',
      'C:\\MotionGenesis\\MotionGenesis.exe'
    );
    if (homeDirectory) {
      candidateCommands.push(
        path.join(homeDirectory, 'MotionGenesis', 'MotionGenesis'),
        path.join(homeDirectory, 'MotionGenesis', 'MotionGenesis.exe')
      );
    }
  } else if (resolvedPlatform === 'darwin') {
    candidateCommands.push('/Applications/MotionGenesis/MotionGenesis');
  }

  const seen = new Set();
  return candidateCommands
    .filter((candidate) => {
      if (seen.has(candidate)) {
        return false;
      }
      seen.add(candidate);
      return true;
    })
    .map((candidate) => ({
      path: candidate,
      exists: fs.existsSync(candidate),
    }));
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

  const configuredPath = readMotionGenesisBinFromConfig();
  if (configuredPath) {
    return {
      command: configuredPath,
      source: 'config',
    };
  }

  for (const candidate of getMotionGenesisCommandCandidates(env, resolvedPlatform)) {
    if (candidate.exists) {
      return {
        command: candidate.path,
        source: 'platform-search',
      };
    }
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

function getMotionGenesisRuntimeInfo(options) {
  const settings = options || {};
  const sceneDirectory = settings.sceneDirectory || settings.workspaceRoot || process.cwd();
  const workspaceRoot = settings.workspaceRoot || sceneDirectory;
  const environment = settings.environment || process.env;
  const platform = settings.platform || process.platform;
  const commandInfo = resolveMotionGenesisCommand(
    sceneDirectory,
    workspaceRoot,
    environment,
    platform
  );
  const ptyInspection = inspectNodePtyLoad(platform);

  return {
    command: commandInfo.command,
    source: commandInfo.source,
    exists: fs.existsSync(commandInfo.command),
    configuredPath: readMotionGenesisBinFromConfig(),
    candidates: getMotionGenesisCommandCandidates(environment, platform),
    nodeVersion: process.version,
    requiredModule: ptyInspection.requiredModule,
    resolvedModulePath: ptyInspection.resolvedModulePath,
    loadAttempts: ptyInspection.loadAttempts,
    ptyAvailable: ptyInspection.ptyAvailable,
    ptyError: ptyInspection.ptyError,
  };
}

function createInitialRunState(
  id,
  mode,
  filePath,
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
    mode,
    filePath,
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
    run.output = trimOutput(
      run.pty ? normalizePtyOutput(nextOutput, run.ptyCols) : nextOutput,
      run.options.scrollbackLimit
    );
    if (run.status === 'success' || run.status === 'failed') {
      return;
    }

    const rawChunk = options && options.rawChunk ? options.rawChunk : text;
    const chunk = run.pty ? normalizePtyOutput(rawChunk, run.ptyCols) : rawChunk;
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
      mode: run.mode,
      filePath: run.filePath,
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

  function validateResolvedRunTarget(target) {
    if (!target.simulationSettings) {
      throw new Error('simulationSettings is required.');
    }

    if (!isWithinRoot(target.settingsFilePath, target.workspaceRoot)) {
      throw new Error('Motion Genesis files must stay within the workspace root.');
    }

    if (target.sceneFilePath && !isWithinRoot(target.sceneFilePath, target.workspaceRoot)) {
      throw new Error('Motion Genesis files must stay within the workspace root.');
    }

    if (target.sceneFilePath) {
      if (!fs.existsSync(target.sceneFilePath) || !fs.statSync(target.sceneFilePath).isFile()) {
        throw new Error('Scene file not found.');
      }
    }

    if (!fs.existsSync(target.settingsFilePath) || !fs.statSync(target.settingsFilePath).isFile()) {
      throw new Error(`Motion Genesis input file not found: ${target.simulationSettings}`);
    }

    if (!isLikelyMotionGenesisInputPath(target.simulationSettings)) {
      throw new Error('simulationSettings must point to a Motion Genesis input file with a .al or .txt extension.');
    }
  }

  function findActiveRun(runKey) {
    for (const run of runs.values()) {
      if (run.runKey === runKey && (run.status === 'running' || run.status === 'waiting-input')) {
        return run;
      }
    }
    return null;
  }

  function startResolvedRun(target) {
    validateResolvedRunTarget(target);
    const activeRun = findActiveRun(target.runKey);
    if (activeRun) {
      return serializeRun(activeRun);
    }

    const id = crypto.randomUUID();
    const runOptions = normalizeRunOptions(target.options);
    const simulationDirectory = path.dirname(target.settingsFilePath);
    const simText = fs.readFileSync(target.settingsFilePath, 'utf8');
    ensureOdeOutputDirectories(
      simulationDirectory,
      target.workspaceRoot,
      detectOdeOutputPathsFromSimText(simText)
    );
    const commandInfo = resolveMotionGenesisCommand(
      simulationDirectory,
      target.workspaceRoot,
      environment,
      platform
    );
    let launchSimulationSettings = path.basename(target.settingsFilePath);
    let tempInputFilePath = null;
    if (runOptions.autoQuit) {
      const tempInput = buildAutoQuitInputFile(target.settingsFilePath, id);
      launchSimulationSettings = tempInput.tempFileName;
      tempInputFilePath = tempInput.tempFilePath;
    }

    const launchInfo = resolveMotionGenesisLaunch(
      commandInfo.command,
      launchSimulationSettings,
      platform,
      environment
    );
    assertInteractivePtyAvailable(platform, environment);
    const child = launchInfo.nativePty
      ? spawnPtyProcess(launchInfo.spawnCommand, launchInfo.spawnArgs, {
          cwd: simulationDirectory,
          env: environment,
          cols: DEFAULT_PTY_COLS,
          rows: DEFAULT_PTY_ROWS,
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
      target.mode,
      target.filePath,
      target.scenePath,
      target.sceneFilePath,
      target.simulationSettings,
      commandInfo.command,
      commandInfo.source,
      simulationDirectory,
      target.workspaceRoot,
      runOptions
    );
    run.child = child;
    run.runKey = target.runKey;
    run.pid = typeof child.pid === 'number' ? child.pid : null;
    run.commandLine = launchInfo.commandLine;
    run.tempInputFilePath = tempInputFilePath;
    run.pty = launchInfo.pty === true;
    run.nativePty = launchInfo.nativePty === true;
    run.inputTerminator = launchInfo.inputTerminator || '\n';
    run.stopSignal = launchInfo.stopSignal;
    run.ptyCols = DEFAULT_PTY_COLS;
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

  function startRun(options) {
    const scenePath = String(options.scenePath || '');
    const simulationSettings = String(options.simulationSettings || '').trim();
    const sceneFilePath = path.resolve(options.sceneFilePath);
    const workspaceRoot = path.resolve(options.workspaceRoot);
    const sceneDirectory = path.dirname(sceneFilePath);
    const settingsFilePath = path.resolve(sceneDirectory, simulationSettings);
    return startResolvedRun({
      mode: 'scene',
      filePath: toWorkspaceRelativePath(settingsFilePath, workspaceRoot),
      runKey: scenePath,
      scenePath,
      sceneFilePath,
      settingsFilePath,
      simulationSettings,
      options: options.options,
      workspaceRoot,
    });
  }

  function startFileRun(options) {
    const filePath = String(options.filePath || '').trim();
    const settingsFilePath = path.resolve(options.settingsFilePath);
    const workspaceRoot = path.resolve(options.workspaceRoot);

    return startResolvedRun({
      mode: 'file',
      filePath,
      runKey: filePath,
      scenePath: null,
      sceneFilePath: null,
      settingsFilePath,
      simulationSettings: filePath,
      options: options.options,
      workspaceRoot,
    });
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
    startFileRun,
    startRun,
  };
}

module.exports = {
  assertInteractivePtyAvailable,
  createMotionGenesisRunManager,
  detectOdeOutputPathsFromSimText,
  ensureOdeOutputDirectories,
  getMotionGenesisCommandCandidates,
  getMotionGenesisRuntimeInfo,
  inspectNodePtyLoad,
  normalizePtyOutput,
  normalizeRunOptions,
  resolveMotionGenesisCommand,
};
