/**
 * List or kill orphaned MGView server / static-preview processes.
 *
 * Usage:
 *   npm run cleanup:servers
 *   npm run cleanup:servers -- --force
 *   npm run cleanup:servers -- --force --keep-port 8000
 */
import { execSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function parseArgs(argv) {
  const keepPorts = new Set();
  let force = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--force') {
      force = true;
      continue;
    }
    if (arg === '--dry-run') {
      force = false;
      continue;
    }
    if (arg === '--keep-port') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Missing value for --keep-port');
      }
      keepPorts.add(Number(value));
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  return { force, keepPorts };
}

function listProcessesUnix() {
  const output = execSync('ps -ax -o pid=,command=', { encoding: 'utf8' });
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const spaceIndex = line.indexOf(' ');
      const pid = Number(line.slice(0, spaceIndex).trim());
      const command = line.slice(spaceIndex + 1).trim();
      return { pid, command };
    })
    .filter((entry) => Number.isInteger(entry.pid) && entry.pid > 0);
}

function listProcessesWindows() {
  const output = execSync('wmic process where "name=\'node.exe\'" get ProcessId,CommandLine /FORMAT:CSV', {
    encoding: 'utf8',
  });
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('Node'))
    .map((line) => {
      const columns = line.split(',');
      const pid = Number(columns[columns.length - 2]);
      const command = columns[columns.length - 1] ?? '';
      return { pid, command };
    })
    .filter((entry) => Number.isInteger(entry.pid) && entry.pid > 0 && entry.command.length > 0);
}

function listProcesses() {
  return process.platform === 'win32' ? listProcessesWindows() : listProcessesUnix();
}

function classifyProcess(command) {
  const normalized = command.replace(/\\/g, '/');
  if (normalized.includes('/bin/server.js') || /\bbin\/server\.js\b/.test(normalized)) {
    return 'server';
  }
  if (normalized.includes('previewSite.mjs')) {
    return 'preview';
  }
  if (normalized.includes('npm run build:info && node scripts/previewSite.mjs')) {
    return 'preview-shell';
  }
  return null;
}

function extractPort(command, kind) {
  if (kind !== 'server') {
    return null;
  }

  const flagMatch = command.match(/(?:^|\s)--port(?:=|\s+)(\d+)/);
  if (flagMatch) {
    return Number(flagMatch[1]);
  }

  const positionalMatch = command.match(/(?:^|\s)bin[\\/]+server\.js(?:\s+)(\d+)(?:\s|$)/);
  if (positionalMatch) {
    return Number(positionalMatch[1]);
  }

  return null;
}

function findManagedProcesses(keepPorts) {
  const currentPid = process.pid;
  const matches = [];

  for (const entry of listProcesses()) {
    if (entry.pid === currentPid) {
      continue;
    }

    const kind = classifyProcess(entry.command);
    if (!kind) {
      continue;
    }

    const port = extractPort(entry.command, kind === 'server' ? 'server' : 'preview');
    if (port !== null && keepPorts.has(port)) {
      continue;
    }

    matches.push({
      pid: entry.pid,
      kind,
      port,
      command: entry.command,
    });
  }

  return matches.sort((left, right) => left.pid - right.pid);
}

function killProcess(pid) {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }

  process.kill(pid, 'SIGTERM');
}

function formatTarget(target) {
  const portLabel = target.port === null ? '' : ` port ${target.port}`;
  return `PID ${target.pid} [${target.kind}${portLabel}] ${target.command}`;
}

function main() {
  const { force, keepPorts } = parseArgs(process.argv.slice(2));
  const targets = findManagedProcesses(keepPorts);

  if (targets.length === 0) {
    console.log('No orphaned MGView server or static preview processes found.');
    return;
  }

  console.log(`${force ? 'Killing' : 'Would kill'} ${targets.length} process(es):`);
  for (const target of targets) {
    console.log(`  - ${formatTarget(target)}`);
  }

  if (!force) {
    console.log('\nDry run only. Re-run with --force to terminate them.');
    return;
  }

  const failed = [];
  for (const target of targets) {
    try {
      killProcess(target.pid);
    } catch (error) {
      failed.push({ target, error });
    }
  }

  if (failed.length > 0) {
    for (const { target, error } of failed) {
      console.error(`Failed to kill PID ${target.pid}: ${error instanceof Error ? error.message : error}`);
    }
    process.exit(1);
  }

  console.log(`\nStopped ${targets.length} process(es).`);
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
