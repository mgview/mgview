#!/usr/bin/env node

const util = require('util');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DEFAULT_PORT = 8000;
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const MGVIEW_ROOT = path.resolve(__dirname, '..');
const MODERN_DIST_DIR = path.resolve(__dirname, '../frontend/dist');
const API_PREFIX = '/MGView/api';

function isWithinRoot(candidatePath) {
  return candidatePath === PROJECT_ROOT || candidatePath.indexOf(PROJECT_ROOT + path.sep) === 0;
}

function main(argv) {
  new HttpServer({
    GET: createServlet(StaticServlet),
    HEAD: createServlet(StaticServlet),
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

function StaticServlet() {}

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
};

StaticServlet.prototype.handleRequest = function(req, res) {
  const pathname = decodeURIComponent(req.url.pathname);
  const normalizedPathname = pathname.replace(/\/{2,}/g, '/');

  if (normalizedPathname !== pathname) {
    return this.sendRedirect_(req, res, normalizedPathname + req.url.search);
  }

  if (normalizedPathname.indexOf(API_PREFIX + '/') === 0) {
    return this.handleApiRequest_(req, res, normalizedPathname);
  }

  if (
    normalizedPathname === '/MGView/modern' ||
    normalizedPathname === '/MGView/modern/' ||
    normalizedPathname === '/MGView/modern/simple'
  ) {
    return this.sendFile_(req, res, path.join(MODERN_DIST_DIR, 'index.html'));
  }

  if (normalizedPathname.indexOf('/MGView/modern/assets/') === 0) {
    return this.sendFile_(
      req,
      res,
      path.join(MODERN_DIST_DIR, normalizedPathname.substring('/MGView/modern/'.length))
    );
  }

  if (normalizedPathname.indexOf('/MGView/assets/') === 0) {
    return this.sendFile_(req, res, path.join(MODERN_DIST_DIR, normalizedPathname.substring('/MGView/'.length)));
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
  if (pathname === API_PREFIX + '/list' && req.method === 'GET') {
    return this.handleListApi_(req, res);
  }
  if (pathname === API_PREFIX + '/file' && req.method === 'GET') {
    return this.handleGetFileApi_(req, res);
  }
  if (pathname === API_PREFIX + '/file' && req.method === 'PUT') {
    return this.handlePutFileApi_(req, res);
  }

  this.sendJson_(res, 404, {
    error: 'Not found',
  });
};

StaticServlet.prototype.handleListApi_ = function(req, res) {
  const requestedPath = req.url.searchParams.get('path') || '.';
  const directoryPath = this.resolveApiPath_(requestedPath, {
    allowRoot: true,
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

      const normalizedPath = this.normalizeRelativePath_(directoryPath);
      const visibleEntries = entries
        .filter((entry) => entry.name.charAt(0) !== '.')
        .map((entry) => ({
          name: entry.name,
          path: path.posix.join(normalizedPath, entry.name),
          type: entry.isDirectory() ? 'directory' : 'file',
        }))
        .sort((left, right) => {
          if (left.type !== right.type) {
            return left.type === 'directory' ? -1 : 1;
          }
          return left.name.localeCompare(right.name);
        });

      this.sendJson_(res, 200, {
        path: normalizedPath || '.',
        parentPath: normalizedPath ? path.posix.dirname(normalizedPath) || '.' : null,
        entries: visibleEntries,
      });
    });
  });
};

StaticServlet.prototype.handleGetFileApi_ = function(req, res) {
  const requestedPath = req.url.searchParams.get('path');
  if (!requestedPath) {
    return this.sendJson_(res, 400, { error: 'Missing path.' });
  }

  const filePath = this.resolveApiPath_(requestedPath);
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
  if (!requestedPath) {
    return this.sendJson_(res, 400, { error: 'Missing path.' });
  }

  const filePath = this.resolveApiPath_(requestedPath);
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
          path: this.normalizeRelativePath_(filePath),
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
  return this.resolveApiPath_(pathname, {
    fromUrlPath: true,
  });
};

StaticServlet.prototype.resolveApiPath_ = function(requestedPath, options) {
  const settings = options || {};
  const normalizedInput = settings.fromUrlPath
    ? requestedPath
    : String(requestedPath || '').replace(/\\/g, '/');
  const relativePath = normalizedInput.replace(/^\/+/, '');
  const basePath = settings.fromUrlPath ? PROJECT_ROOT : MGVIEW_ROOT;
  const resolvedPath = path.resolve(basePath, relativePath || '.');

  if (!isWithinRoot(resolvedPath)) {
    return null;
  }

  if (!settings.allowRoot && resolvedPath === PROJECT_ROOT && !settings.fromUrlPath) {
    return null;
  }

  const relativeSegments = path.relative(PROJECT_ROOT, resolvedPath).split(path.sep);
  if (relativeSegments.some((segment) => segment && segment.charAt(0) === '.')) {
    return null;
  }

  return resolvedPath;
};

StaticServlet.prototype.normalizeRelativePath_ = function(filePath) {
  const basePath = isWithinRoot(filePath) && filePath.indexOf(MGVIEW_ROOT) === 0 ? MGVIEW_ROOT : PROJECT_ROOT;
  const relativePath = path.relative(basePath, filePath).split(path.sep).join('/');
  return relativePath === '' ? '' : relativePath;
};

StaticServlet.prototype.sendJson_ = function(res, statusCode, value) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify(value, null, 2) + '\n');
};

StaticServlet.prototype.sendError_ = function(req, res, error) {
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
    res.end();
  });
  file.on('error', (error) => {
    this.sendError_(req, res, error);
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
