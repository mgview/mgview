const path = require('path');
const { prepareWorkspaceRoot, writeWorkspaceConfig } = require('./workspaceRoots.js');

const DEFAULT_PORT = 8000;

function formatServerUsage() {
  return [
    'Usage: node bin/server.js [options]',
    '       node bin/server.js [PORT]   (legacy positional port)',
    '',
    'Options:',
    '  -p, --port PORT         HTTP port (default: 8000)',
    '  -w, --workspace PATH    Workspace directory (saved to ~/.mgview/config.json)',
    '      --verbose           Log each HTTP request and server diagnostics',
    '  -h, --help              Show this help',
    '',
    'Examples:',
    '  node bin/server.js --port 9000 --workspace ~/simulations',
    '  node bin/server.js 8000',
  ].join('\n');
}

function parseServerArgs(argv) {
  const args = { port: DEFAULT_PORT, workspace: null, help: false, verbose: false };
  const positional = [];

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      args.help = true;
      continue;
    }
    if (token === '--port' || token === '-p') {
      const value = argv[++index];
      if (value === undefined) {
        throw new Error('--port requires a value.');
      }
      args.port = Number(value);
      continue;
    }
    if (token === '--workspace' || token === '-w') {
      const value = argv[++index];
      if (value === undefined) {
        throw new Error('--workspace requires a value.');
      }
      args.workspace = value;
      continue;
    }
    if (token === '--verbose') {
      args.verbose = true;
      continue;
    }
    if (token.startsWith('-')) {
      throw new Error('Unknown option: ' + token);
    }
    positional.push(token);
  }

  if (positional.length > 0) {
    const legacyPort = Number(positional[0]);
    if (!Number.isFinite(legacyPort)) {
      throw new Error('Expected numeric port, got: ' + positional[0]);
    }
    args.port = legacyPort;
  }

  if (!Number.isFinite(args.port) || args.port < 1 || args.port > 65535) {
    throw new Error('Invalid port (use 1–65535).');
  }

  return args;
}

function applyStartupWorkspace(workspacePath, appRoot) {
  const prepared = prepareWorkspaceRoot(workspacePath, appRoot);
  if (prepared.error) {
    return prepared;
  }

  writeWorkspaceConfig(prepared.workspaceRoot, appRoot);
  return { workspaceRoot: prepared.workspaceRoot };
}

module.exports = {
  DEFAULT_PORT,
  applyStartupWorkspace,
  formatServerUsage,
  parseServerArgs,
};
