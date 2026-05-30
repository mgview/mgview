const fs = require('fs');
const os = require('os');
const path = require('path');

const URL_APP_PREFIXES = ['samples/', 'assets/', 'bundled/', 'legacy/'];
const WORKSPACE_FORBIDDEN_PREFIXES = ['samples/', 'assets/', 'bundled/', 'legacy/'];

function isWithinRoot(candidatePath, rootPath) {
  const normalizedRoot = path.resolve(rootPath);
  const normalizedCandidate = path.resolve(candidatePath);
  return (
    normalizedCandidate === normalizedRoot ||
    normalizedCandidate.indexOf(normalizedRoot + path.sep) === 0
  );
}

function normalizeLogicalPath(requestedPath) {
  return String(requestedPath || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');
}

function hasParentTraversal(logicalPath) {
  return logicalPath.split('/').some((segment) => segment === '..');
}

function usesAppRoot(logicalPath) {
  if (!logicalPath || logicalPath === '.') {
    return false;
  }

  return URL_APP_PREFIXES.some(
    (prefix) => logicalPath === prefix.slice(0, -1) || logicalPath.startsWith(prefix)
  );
}

function isForbiddenWorkspacePath(logicalPath) {
  if (!logicalPath || logicalPath === '.') {
    return false;
  }

  if (hasParentTraversal(logicalPath)) {
    return true;
  }

  return WORKSPACE_FORBIDDEN_PREFIXES.some(
    (prefix) => logicalPath === prefix.slice(0, -1) || logicalPath.startsWith(prefix)
  );
}

function parseApiRoot(rootParam) {
  const root = String(rootParam || 'workspace').toLowerCase();
  if (root === 'workspace' || root === 'sample' || root === 'app') {
    return root;
  }
  return null;
}

function getApiRootDirectory(apiRoot, appRoot, workspaceRoot) {
  if (apiRoot === 'workspace') {
    return workspaceRoot;
  }
  if (apiRoot === 'sample') {
    return path.join(appRoot, 'samples');
  }
  if (apiRoot === 'app') {
    return appRoot;
  }
  return null;
}

function resolveLogicalPathForRoot(apiRoot, requestedPath, appRoot, workspaceRoot, options) {
  const settings = options || {};
  const parsedRoot = parseApiRoot(apiRoot);
  if (!parsedRoot) {
    return null;
  }

  const logicalPath = normalizeLogicalPath(
    settings.fromUrlPath ? String(requestedPath || '').replace(/^\/+/, '') : requestedPath
  );

  if (parsedRoot === 'workspace' && isForbiddenWorkspacePath(logicalPath)) {
    return null;
  }

  if (hasParentTraversal(logicalPath)) {
    return null;
  }

  const rootPath = getApiRootDirectory(parsedRoot, appRoot, workspaceRoot);
  const resolvedPath = path.resolve(rootPath, logicalPath || '.');

  if (!isWithinRoot(resolvedPath, rootPath)) {
    return null;
  }

  if (!settings.allowRoot && resolvedPath === rootPath && !settings.fromUrlPath) {
    return null;
  }

  const relativeSegments = path.relative(rootPath, resolvedPath).split(path.sep);
  if (relativeSegments.some((segment) => segment && segment.charAt(0) === '.')) {
    return null;
  }

  return resolvedPath;
}

function resolveUrlAssetPath(requestedPath, appRoot, workspaceRoot, options) {
  const settings = options || {};
  const logicalPath = normalizeLogicalPath(
    settings.fromUrlPath ? requestedPath.replace(/^\/+/, '') : requestedPath
  );
  const rootPath = usesAppRoot(logicalPath) ? appRoot : workspaceRoot;
  const resolvedPath = path.resolve(rootPath, logicalPath || '.');

  if (!isWithinRoot(resolvedPath, rootPath)) {
    return null;
  }

  if (!settings.allowRoot && resolvedPath === rootPath && !settings.fromUrlPath) {
    return null;
  }

  const relativeSegments = path.relative(rootPath, resolvedPath).split(path.sep);
  if (relativeSegments.some((segment) => segment && segment.charAt(0) === '.')) {
    return null;
  }

  return resolvedPath;
}

function toLogicalPathForRoot(filePath, apiRoot, appRoot, workspaceRoot) {
  const parsedRoot = parseApiRoot(apiRoot);
  if (!parsedRoot) {
    return null;
  }

  const rootPath = getApiRootDirectory(parsedRoot, appRoot, workspaceRoot);
  const normalizedFilePath = path.resolve(filePath);

  if (!isWithinRoot(normalizedFilePath, rootPath)) {
    return null;
  }

  return path.relative(rootPath, normalizedFilePath).split(path.sep).join('/');
}

function getDefaultWorkspaceRoot(appRoot) {
  return path.resolve(appRoot, '..');
}

function isWorkspaceInsideAppInstall(workspaceRoot, appRoot) {
  const resolvedWorkspace = path.resolve(workspaceRoot);
  const resolvedApp = path.resolve(appRoot);
  return (
    resolvedWorkspace === resolvedApp ||
    isWithinRoot(resolvedWorkspace, resolvedApp)
  );
}

function normalizeWorkspaceRoot(workspaceRoot, appRoot) {
  const resolvedApp = path.resolve(appRoot);
  const defaultWorkspaceRoot = getDefaultWorkspaceRoot(resolvedApp);
  const resolvedWorkspace = path.resolve(workspaceRoot);

  if (!isWorkspaceInsideAppInstall(resolvedWorkspace, resolvedApp)) {
    return {
      workspaceRoot: resolvedWorkspace,
      corrected: false,
      defaultWorkspaceRoot,
    };
  }

  return {
    workspaceRoot: defaultWorkspaceRoot,
    corrected: true,
    defaultWorkspaceRoot,
  };
}

function getConfigPath() {
  return path.join(os.homedir(), '.mgview', 'config.json');
}

function readWorkspaceConfig(appRoot) {
  const configPath = getConfigPath();
  const resolvedApp = path.resolve(appRoot);

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.workspaceRoot === 'string' && parsed.workspaceRoot.trim().length > 0) {
      const normalized = normalizeWorkspaceRoot(parsed.workspaceRoot.trim(), resolvedApp);
      if (normalized.corrected) {
        console.warn(
          'MGView workspace was inside the app install; resetting to ' + normalized.workspaceRoot
        );
        writeWorkspaceConfig(normalized.workspaceRoot, resolvedApp);
      }
      return {
        workspaceRoot: normalized.workspaceRoot,
        configPath,
      };
    }
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      console.warn('Could not read MGView workspace config:', error.message);
    }
  }

  return {
    workspaceRoot: null,
    configPath,
  };
}

function writeWorkspaceConfig(workspaceRoot, appRoot) {
  const configPath = getConfigPath();
  const normalized = normalizeWorkspaceRoot(workspaceRoot, appRoot);
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(
    configPath,
    JSON.stringify(
      {
        workspaceRoot: normalized.workspaceRoot,
      },
      null,
      2
    ) + '\n',
    'utf8'
  );

  return {
    workspaceRoot: normalized.workspaceRoot,
    configPath,
  };
}

function createWorkspaceRoots(appRoot, configuredWorkspaceRoot) {
  const resolvedApp = path.resolve(appRoot);
  const defaultWorkspaceRoot = getDefaultWorkspaceRoot(resolvedApp);
  const workspaceRoot = configuredWorkspaceRoot
    ? normalizeWorkspaceRoot(configuredWorkspaceRoot, resolvedApp).workspaceRoot
    : defaultWorkspaceRoot;

  return {
    appRoot: resolvedApp,
    workspaceRoot,
    defaultWorkspaceRoot,
  };
}

module.exports = {
  URL_APP_PREFIXES,
  WORKSPACE_FORBIDDEN_PREFIXES,
  createWorkspaceRoots,
  getConfigPath,
  getDefaultWorkspaceRoot,
  isForbiddenWorkspacePath,
  isWithinRoot,
  isWorkspaceInsideAppInstall,
  normalizeLogicalPath,
  normalizeWorkspaceRoot,
  parseApiRoot,
  readWorkspaceConfig,
  resolveLogicalPathForRoot,
  resolveUrlAssetPath,
  toLogicalPathForRoot,
  usesAppRoot,
  writeWorkspaceConfig,
};
