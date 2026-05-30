#!/usr/bin/env node

const util = require('util');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DEFAULT_PORT = 8000;
const MGVIEW_ROOT = path.resolve(__dirname, '..');
const MODERN_DIST_DIR = path.resolve(__dirname, '../frontend/dist');
const VITE_BUNDLED_DIR = 'bundled'; // sync with frontend/scripts/deployConfig.mjs → viteBundledAssetsDir
const API_PREFIX = '/mgview/api';
const workspaceRoots = require('./workspaceRoots.js');
const {
  createWorkspaceRoots,
  isWorkspaceInsideAppInstall,
  normalizeLogicalPath,
  parseApiRoot,
  getDefaultWorkspaceRoot,
  readWorkspaceConfig,
  resolveLogicalPathForRoot,
  resolveUrlAssetPath,
  toLogicalPathForRoot,
  writeWorkspaceConfig,
} = workspaceRoots;

function main(argv) {
  new HttpServer({
    GET: createServlet(StaticServlet),
    HEAD: createServlet(StaticServlet),
    POST: createServlet(StaticServlet),
    PUT: createServlet(StaticServlet),
  }).start(Number(argv[2]) || DEFAULT_PORT);
}

function escapeHtml(value) {
  return value
    .toString()
    .replace('<', '&lt;')
    .replace('>', '&gt;')
    .replace('"', '&quot;');
}

function createServlet(Class) {
  const servlet = new Class();
  return servlet.handleRequest.bind(servlet);
}

function HttpServer(handlers) {
  this.handlers = handlers;
  this.server = http.createServer(this.handleRequest_.bind(this));
}

HttpServer.prototype.start = function(port) {
  const self = this;
  this.port = port;
  this.server.on('error', function(error) {
    console.error('Failed to start MGView server on port ' + self.port + ':');
    console.error(error.message);
  });
  this.server.listen(port, function() {
    console.log('Http Server running at http://localhost:' + port + '/');
  });
};

HttpServer.prototype.parseUrl_ = function(urlString) {
  return new URL(urlString, 'http://localhost');
};

HttpServer.prototype.handleRequest_ = function(req, res) {
  let logEntry = req.method + ' ' + req.url;
  if (req.headers['user-agent']) {
    logEntry += ' ' + req.headers['user-agent'];
  }
  console.log(logEntry);

  req.url = this.parseUrl_(req.url);

  const handler = this.handlers[req.method];
  if (!handler) {
    res.writeHead(501);
    res.end();
    return;
  }

  handler.call(this, req, res);
};

function StaticServlet() {
  this.reloadWorkspaceRoots();
}

StaticServlet.prototype.syncWorkspaceRootsFromConfig_ = function() {
  const config = readWorkspaceConfig(MGVIEW_ROOT);
  const roots = createWorkspaceRoots(MGVIEW_ROOT, config.workspaceRoot);
  this.appRoot = roots.appRoot;
  this.workspaceRoot = roots.workspaceRoot;
  this.defaultWorkspaceRoot = roots.defaultWorkspaceRoot;
};

StaticServlet.prototype.persistWorkspaceRoot_ = function(absoluteWorkspaceRoot) {
  const written = writeWorkspaceConfig(absoluteWorkspaceRoot, this.appRoot);
  this.workspaceRoot = written.workspaceRoot;
  this.defaultWorkspaceRoot = getDefaultWorkspaceRoot(this.appRoot);
};

StaticServlet.prototype.reloadWorkspaceRoots = function() {
  this.syncWorkspaceRootsFromConfig_();
};

StaticServlet.prototype.getWorkspaceInfo_ = function() {
  return {
    workspaceRoot: this.workspaceRoot,
    appRoot: this.appRoot,
    defaultWorkspaceRoot: this.defaultWorkspaceRoot,
    configPath: workspaceRoots.getConfigPath(),
  };
};

StaticServlet.MimeMap = {
  txt: 'text/plain; charset=utf-8',
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  xml: 'application/xml; charset=utf-8',
  json: 'application/json; charset=utf-8',
  js: 'application/javascript; charset=utf-8',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  png: 'image/png',
  svg: 'image/svg+xml',
  obj: 'text/plain; charset=utf-8',
  stl: 'model/stl',
};

StaticServlet.prototype.getLegacyMountRedirect_ = function(pathname) {
  if (pathname === '/MGView' || pathname.indexOf('/MGView/') === 0) {
    return '/mgview' + pathname.substring('/MGView'.length);
  }

  if (pathname === '/legacy' || pathname.indexOf('/legacy/') === 0) {
    return '/mgview' + pathname;
  }

  return null;
};

StaticServlet.prototype.handleRequest = function(req, res) {
  const pathname = decodeURIComponent(req.url.pathname);
  const normalizedPathname = pathname.replace(/\/{2,}/g, '/');

  if (normalizedPathname !== pathname) {
    return this.sendRedirect_(req, res, normalizedPathname + req.url.search);
  }

  const legacyMountRedirect = this.getLegacyMountRedirect_(normalizedPathname);
  if (legacyMountRedirect) {
    return this.sendRedirect_(req, res, legacyMountRedirect + req.url.search);
  }

  if (normalizedPathname.indexOf(API_PREFIX + '/') === 0) {
    return this.handleApiRequest_(req, res, normalizedPathname);
  }

  if (normalizedPathname === '/mgview') {
    return this.sendRedirect_(req, res, '/mgview/' + req.url.search);
  }
  if (normalizedPathname === '/mgview/simple') {
    return this.sendRedirect_(req, res, '/mgview/simple/' + req.url.search);
  }
  if (normalizedPathname === '/mgview/' || normalizedPathname === '/mgview/simple/') {
    return this.sendFile_(req, res, path.join(MODERN_DIST_DIR, 'index.html'));
  }

  // Vite bundles only — repo-root assets/ (textures, etc.) uses normal path resolution below.
  if (normalizedPathname.indexOf('/mgview/' + VITE_BUNDLED_DIR + '/') === 0) {
    return this.sendFile_(
      req,
      res,
      path.join(MODERN_DIST_DIR, normalizedPathname.substring('/mgview/'.length))
    );
  }

  const filePath = this.resolveRequestPath_(normalizedPathname);
  if (!filePath) {
    return this.sendForbidden_(req, res, pathname);
  }

  fs.stat(filePath, (err, stat) => {
    if (err) {
      return this.sendMissing_(req, res, filePath);
    }
    if (stat.isDirectory()) {
      return this.sendDirectory_(req, res, filePath);
    }
    return this.sendFile_(req, res, filePath);
  });
};

StaticServlet.prototype.handleApiRequest_ = function(req, res, pathname) {
  this.syncWorkspaceRootsFromConfig_();

  if (pathname === API_PREFIX + '/workspace') {
    if (req.method === 'GET') {
      return this.sendJson_(res, 200, this.getWorkspaceInfo_());
    }
    if (req.method === 'POST') {
      return this.handlePostWorkspaceApi_(req, res);
    }
  }
  if (pathname === API_PREFIX + '/list' && req.method === 'GET') {
    return this.handleListApi_(req, res);
  }
  if (pathname === API_PREFIX + '/file' && req.method === 'GET') {
    return this.handleGetFileApi_(req, res);
  }
  if (pathname === API_PREFIX + '/file' && req.method === 'PUT') {
    return this.handlePutFileApi_(req, res);
  }
  if (pathname === API_PREFIX + '/file' && req.method === 'POST') {
    return this.handlePostFileApi_(req, res);
  }

  this.sendJson_(res, 404, {
    error: 'Not found',
  });
};

StaticServlet.prototype.handlePostWorkspaceApi_ = function(req, res) {
  const servlet = this;

  servlet.readRequestBody_(req, (bodyError, body) => {
    if (bodyError) {
      return servlet.sendJson_(res, 500, { error: 'Could not read request body.' });
    }

    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch (parseError) {
      return servlet.sendJson_(res, 400, { error: 'Invalid JSON body.' });
    }

    const nextWorkspaceRoot = parsed && parsed.workspaceRoot;
    if (typeof nextWorkspaceRoot !== 'string' || nextWorkspaceRoot.trim().length === 0) {
      return servlet.sendJson_(res, 400, { error: 'workspaceRoot must be a non-empty string.' });
    }

    const resolvedWorkspaceRoot = path.resolve(nextWorkspaceRoot.trim());
    if (isWorkspaceInsideAppInstall(resolvedWorkspaceRoot, servlet.appRoot)) {
      return servlet.sendJson_(res, 400, {
        error:
          'Workspace must be outside the MGView install folder (for example, the parent folder that contains mgview/).',
      });
    }

    fs.stat(resolvedWorkspaceRoot, (statError, stat) => {
      if (statError) {
        return servlet.sendJson_(res, 404, { error: 'Workspace directory not found.' });
      }
      if (!stat.isDirectory()) {
        return servlet.sendJson_(res, 400, { error: 'Workspace path is not a directory.' });
      }

      try {
        servlet.persistWorkspaceRoot_(resolvedWorkspaceRoot);
      } catch (writeError) {
        return servlet.sendJson_(res, 500, { error: 'Could not save workspace config.' });
      }

      servlet.sendJson_(res, 200, servlet.getWorkspaceInfo_());
    });
  });
};

StaticServlet.prototype.handlePostFileApi_ = function(req, res) {
  const requestedPath = req.url.searchParams.get('path');
  const apiRoot = req.url.searchParams.get('root') || 'workspace';
  if (!requestedPath) {
    return this.sendJson_(res, 400, { error: 'Missing path.' });
  }

  const filePath = this.resolveApiPath_(requestedPath, { root: apiRoot });
  if (!filePath) {
    return this.sendJson_(res, 403, { error: 'Forbidden path.' });
  }

  if (path.extname(filePath).toLowerCase() !== '.json') {
    return this.sendJson_(res, 400, { error: 'Only JSON scene files can be created through this API.' });
  }

  const parentDirectory = path.dirname(filePath);
  fs.stat(parentDirectory, (parentError, parentStat) => {
    if (parentError) {
      return this.sendJson_(res, 404, { error: 'Parent directory not found.' });
    }
    if (!parentStat.isDirectory()) {
      return this.sendJson_(res, 400, { error: 'Parent path is not a directory.' });
    }

    fs.stat(filePath, (statError, stat) => {
      if (!statError && stat.isFile()) {
        return this.sendJson_(res, 409, { error: 'File already exists.' });
      }
      if (!statError) {
        return this.sendJson_(res, 400, { error: 'Requested path is not a file.' });
      }
      if (statError.code !== 'ENOENT') {
        return this.sendJson_(res, 500, { error: 'Could not inspect target file.' });
      }

      this.readRequestBody_(req, (bodyError, body) => {
        if (bodyError) {
          return this.sendJson_(res, 500, { error: 'Could not read request body.' });
        }

        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch (parseError) {
          return this.sendJson_(res, 400, { error: 'Invalid JSON body.' });
        }

        const serialized = JSON.stringify(parsed, null, 2) + '\n';
        fs.writeFile(filePath, serialized, { encoding: 'utf8', flag: 'wx' }, (writeError) => {
          if (writeError) {
            if (writeError.code === 'EEXIST') {
              return this.sendJson_(res, 409, { error: 'File already exists.' });
            }
            return this.sendJson_(res, 500, { error: 'Could not create file.' });
          }

          this.sendJson_(res, 201, {
            ok: true,
            path: this.normalizeRelativePath_(filePath, apiRoot),
          });
        });
      });
    });
  });
};

StaticServlet.prototype.handleListApi_ = function(req, res) {
  const requestedPath = req.url.searchParams.get('path') || '.';
  const apiRoot = req.url.searchParams.get('root') || 'workspace';
  const directoryPath = this.resolveApiPath_(requestedPath, {
    allowRoot: true,
    root: apiRoot,
  });

  if (!directoryPath) {
    return this.sendJson_(res, 403, { error: 'Forbidden path.' });
  }

  fs.stat(directoryPath, (statError, stat) => {
    if (statError) {
      return this.sendJson_(res, 404, { error: 'Directory not found.' });
    }
    if (!stat.isDirectory()) {
      return this.sendJson_(res, 400, { error: 'Requested path is not a directory.' });
    }

    fs.readdir(directoryPath, { withFileTypes: true }, (readError, entries) => {
      if (readError) {
        return this.sendJson_(res, 500, { error: 'Could not read directory.' });
      }

      const listingPath = normalizeLogicalPath(requestedPath) || '.';
      const listingBase = listingPath === '.' ? '' : listingPath;
      const visibleEntries = entries
        .filter((entry) => entry.name.charAt(0) !== '.')
        .map((entry) => ({
          name: entry.name,
          path: listingBase ? path.posix.join(listingBase, entry.name) : entry.name,
          type: entry.isDirectory() ? 'directory' : 'file',
        }))
        .sort((left, right) => {
          if (left.type !== right.type) {
            return left.type === 'directory' ? -1 : 1;
          }
          return left.name.localeCompare(right.name);
        });

      this.sendJson_(res, 200, {
        path: listingPath,
        parentPath: listingPath === '.' ? null : path.posix.dirname(listingPath) || '.',
        entries: visibleEntries,
      });
    });
  });
};

StaticServlet.prototype.handleGetFileApi_ = function(req, res) {
  const requestedPath = req.url.searchParams.get('path');
  const apiRoot = req.url.searchParams.get('root') || 'workspace';
  if (!requestedPath) {
    return this.sendJson_(res, 400, { error: 'Missing path.' });
  }

  const filePath = this.resolveApiPath_(requestedPath, { root: apiRoot });
  if (!filePath) {
    return this.sendJson_(res, 403, { error: 'Forbidden path.' });
  }

  fs.stat(filePath, (statError, stat) => {
    if (statError) {
      return this.sendJson_(res, 404, { error: 'File not found.' });
    }
    if (!stat.isFile()) {
      return this.sendJson_(res, 400, { error: 'Requested path is not a file.' });
    }
    this.sendFile_(req, res, filePath);
  });
};

StaticServlet.prototype.handlePutFileApi_ = function(req, res) {
  const requestedPath = req.url.searchParams.get('path');
  const apiRoot = req.url.searchParams.get('root') || 'workspace';
  if (!requestedPath) {
    return this.sendJson_(res, 400, { error: 'Missing path.' });
  }

  const filePath = this.resolveApiPath_(requestedPath, { root: apiRoot });
  if (!filePath) {
    return this.sendJson_(res, 403, { error: 'Forbidden path.' });
  }

  if (path.extname(filePath).toLowerCase() !== '.json') {
    return this.sendJson_(res, 400, { error: 'Only JSON scene files can be saved through this API.' });
  }

  fs.stat(filePath, (statError, stat) => {
    if (statError) {
      return this.sendJson_(res, 404, { error: 'File not found.' });
    }
    if (!stat.isFile()) {
      return this.sendJson_(res, 400, { error: 'Requested path is not a file.' });
    }

    this.readRequestBody_(req, (bodyError, body) => {
      if (bodyError) {
        return this.sendJson_(res, 500, { error: 'Could not read request body.' });
      }

      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch (parseError) {
        return this.sendJson_(res, 400, { error: 'Invalid JSON body.' });
      }

      const serialized = JSON.stringify(parsed, null, 2) + '\n';
      fs.writeFile(filePath, serialized, 'utf8', (writeError) => {
        if (writeError) {
          return this.sendJson_(res, 500, { error: 'Could not save file.' });
        }

        this.sendJson_(res, 200, {
          ok: true,
          path: this.normalizeRelativePath_(filePath, apiRoot),
        });
      });
    });
  });
};

StaticServlet.prototype.readRequestBody_ = function(req, callback) {
  const chunks = [];
  req.on('data', (chunk) => {
    chunks.push(chunk);
  });
  req.on('end', () => {
    callback(null, Buffer.concat(chunks).toString('utf8'));
  });
  req.on('error', (error) => {
    callback(error);
  });
};

StaticServlet.prototype.resolveRequestPath_ = function(pathname) {
  if (pathname.indexOf('/mgview/') !== 0) {
    return null;
  }

  const relativeUrlPath = pathname.slice('/mgview/'.length);
  return this.resolveApiPath_(relativeUrlPath, {
    fromUrlPath: true,
  });
};

StaticServlet.prototype.resolveApiPath_ = function(requestedPath, options) {
  const settings = options || {};
  const normalizedInput = settings.fromUrlPath
    ? String(requestedPath || '')
    : String(requestedPath || '').replace(/\\/g, '/');

  if (settings.fromUrlPath) {
    return resolveUrlAssetPath(normalizedInput, this.appRoot, this.workspaceRoot, settings);
  }

  const apiRoot = settings.root || 'workspace';
  if (!parseApiRoot(apiRoot)) {
    return null;
  }

  return resolveLogicalPathForRoot(apiRoot, normalizedInput, this.appRoot, this.workspaceRoot, settings);
};

StaticServlet.prototype.normalizeRelativePath_ = function(filePath, apiRoot) {
  const relativePath = toLogicalPathForRoot(filePath, apiRoot || 'workspace', this.appRoot, this.workspaceRoot);
  return relativePath === null ? '' : relativePath;
};

StaticServlet.prototype.sendJson_ = function(res, statusCode, value) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(value, null, 2) + '\n');
};

StaticServlet.prototype.sendError_ = function(req, res, error) {
  if (res.headersSent) {
    console.log('Stream error after headers sent');
    console.log(util.inspect(error));
    if (!res.destroyed) {
      res.end();
    }
    return;
  }

  res.writeHead(500, {
    'Content-Type': 'text/html',
  });
  res.write('<!doctype html>\n');
  res.write('<title>Internal Server Error</title>\n');
  res.write('<h1>Internal Server Error</h1>');
  res.write('<pre>' + escapeHtml(util.inspect(error)) + '</pre>');
  res.end();
  console.log('500 Internal Server Error');
  console.log(util.inspect(error));
};

StaticServlet.prototype.sendMissing_ = function(req, res, filePath) {
  const relativePath = this.relativePath_(filePath);
  res.writeHead(404, {
    'Content-Type': 'text/html',
  });
  res.write('<!doctype html>\n');
  res.write('<title>404 Not Found</title>\n');
  res.write('<h1>Not Found</h1>');
  res.write(
    '<p>The requested URL ' +
      escapeHtml(relativePath) +
      ' was not found on this server.</p>'
  );
  res.end();
  console.log('404 Not Found: ' + relativePath);
};

StaticServlet.prototype.sendForbidden_ = function(req, res, filePath) {
  const relativePath = this.relativePath_(filePath);
  res.writeHead(403, {
    'Content-Type': 'text/html',
  });
  res.write('<!doctype html>\n');
  res.write('<title>403 Forbidden</title>\n');
  res.write('<h1>Forbidden</h1>');
  res.write(
    '<p>You do not have permission to access ' +
      escapeHtml(relativePath) +
      ' on this server.</p>'
  );
  res.end();
  console.log('403 Forbidden: ' + relativePath);
};

StaticServlet.prototype.sendRedirect_ = function(req, res, redirectUrl) {
  res.writeHead(301, {
    'Content-Type': 'text/html',
    Location: redirectUrl,
  });
  res.write('<!doctype html>\n');
  res.write('<title>301 Moved Permanently</title>\n');
  res.write('<h1>Moved Permanently</h1>');
  res.write('<p>The document has moved <a href="' + redirectUrl + '">here</a>.</p>');
  res.end();
  console.log('301 Moved Permanently: ' + redirectUrl);
};

StaticServlet.prototype.sendFile_ = function(req, res, filePath) {
  const file = fs.createReadStream(filePath);
  res.writeHead(200, {
    'Content-Type': StaticServlet.MimeMap[path.extname(filePath).slice(1).toLowerCase()] || 'text/plain; charset=utf-8',
  });

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  file.on('data', res.write.bind(res));
  file.on('close', function() {
    if (!res.destroyed) {
      res.end();
    }
  });
  file.on('error', (error) => {
    this.sendError_(req, res, error);
  });
  res.on('close', function() {
    file.destroy();
  });
};

StaticServlet.prototype.sendDirectory_ = function(req, res, filePath) {
  if (!req.url.pathname.endsWith('/')) {
    return this.sendRedirect_(req, res, req.url.pathname + '/' + req.url.search);
  }

  const indexPath = path.join(filePath, 'index.html');
  fs.stat(indexPath, (indexError, indexStat) => {
    if (!indexError && indexStat.isFile()) {
      return this.sendFile_(req, res, indexPath);
    }

    fs.readdir(filePath, (err, files) => {
      if (err) {
        return this.sendError_(req, res, err);
      }

      if (!files.length) {
        return this.writeDirectoryIndex_(req, res, filePath, []);
      }

      let remaining = files.length;
      files.forEach((fileName, index) => {
        fs.stat(path.join(filePath, fileName), (statError, stat) => {
          if (statError) {
            return this.sendError_(req, res, statError);
          }
          if (stat.isDirectory()) {
            files[index] = fileName + '/';
          }
          remaining -= 1;
          if (!remaining) {
            return this.writeDirectoryIndex_(req, res, filePath, files);
          }
        });
      });
    });
  });
};

StaticServlet.prototype.writeDirectoryIndex_ = function(req, res, filePath, files) {
  const relativePath = this.relativePath_(filePath);
  res.writeHead(200, {
    'Content-Type': 'text/html',
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  res.write('<!doctype html>\n');
  res.write('<title>' + escapeHtml(relativePath) + '</title>\n');
  res.write('<style>\n');
  res.write('  ol { list-style-type: none; font-size: 1.2em; }\n');
  res.write('</style>\n');
  res.write('<h1>Directory: ' + escapeHtml(relativePath) + '</h1>');
  res.write('<ol>');
  files.forEach((fileName) => {
    if (fileName.charAt(0) !== '.') {
      res.write('<li><a href="' + fileName + '">' + escapeHtml(fileName) + '</a></li>');
    }
  });
  res.end('</ol>');
};

StaticServlet.prototype.relativePath_ = function(filePath) {
  return '/' + this.normalizeRelativePath_(String(filePath || ''));
};

main(process.argv);
