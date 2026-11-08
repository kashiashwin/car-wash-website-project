const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

const PORT = parseInt(process.env.PORT, 10) || 5500;
const BACKEND_PORT = parseInt(process.env.BACKEND_PORT, 10) || 5000;
const BACKEND_HOST = process.env.BACKEND_HOST || '127.0.0.1';
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json'
};

// Start backend server if not already running
function ensureBackendRunning() {
  const checkReq = http.get(`http://${BACKEND_HOST}:${BACKEND_PORT}/api/v1/services`, () => {
    console.log(`[Proxy] Backend is already running at http://${BACKEND_HOST}:${BACKEND_PORT}`);
  });

  checkReq.on('error', () => {
    console.log(`[Launcher] Starting backend server on port ${BACKEND_PORT}...`);
    const backendProcess = spawn(process.execPath, ['src/server.js'], {
      cwd: path.join(BASE_DIR, 'backend'),
      stdio: 'inherit',
      shell: false,
      env: { ...process.env, PORT: String(BACKEND_PORT) }
    });

    backendProcess.on('error', (err) => {
      console.error('[Launcher] Failed to start backend process:', err.message);
    });

    process.on('exit', () => {
      try { backendProcess.kill(); } catch (e) {}
    });
  });
}

// Reverse proxy requests to backend
function proxyToBackend(req, res) {
  const options = {
    hostname: BACKEND_HOST,
    port: BACKEND_PORT,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${BACKEND_HOST}:${BACKEND_PORT}`
    }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error(`[Proxy Error] ${req.method} ${req.url}:`, err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: `Backend unreachable at http://${BACKEND_HOST}:${BACKEND_PORT}. Make sure backend is running.`,
      details: err.message
    }));
  });

  req.pipe(proxyReq, { end: true });
}

// Serve static frontend files
function serveStaticFile(req, res) {
  let parsedUrl = new URL(req.url, `http://127.0.0.1:${PORT}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  if (pathname === '/' || pathname === '') {
    pathname = '/frontend/index.html';
  }

  let filePath = path.join(BASE_DIR, pathname);

  // If path doesn't start with /frontend, check if it exists in /frontend/
  if (!fs.existsSync(filePath) && !pathname.startsWith('/frontend/')) {
    const altPath = path.join(BASE_DIR, 'frontend', pathname);
    if (fs.existsSync(altPath)) {
      filePath = altPath;
    }
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found: ' + pathname);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });

    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  // Proxy API and WebSocket polling requests to backend
  if (req.url.startsWith('/api/') || req.url.startsWith('/socket.io/')) {
    return proxyToBackend(req, res);
  }

  serveStaticFile(req, res);
});

// Proxy WebSocket upgrades (e.g. for Socket.io) to backend
server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/socket.io/')) {
    const proxyReq = http.request({
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers
    });

    proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
      socket.write(
        `HTTP/${proxyRes.httpVersion} ${proxyRes.statusCode} ${proxyRes.statusMessage}\r\n` +
        Object.entries(proxyRes.headers)
          .map(([k, v]) => `${k}: ${v}\r\n`)
          .join('') +
        '\r\n'
      );
      if (proxyHead && proxyHead.length) socket.write(proxyHead);
      proxySocket.pipe(socket);
      socket.pipe(proxySocket);
    });

    proxyReq.on('error', () => {
      socket.destroy();
    });

    proxyReq.end();
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[Error] Port ${PORT} is already in use.`);
    console.error(`Another instance of the server might already be running.`);
    console.error(`Closing old process and restarting...\n`);
    process.exit(1);
  } else {
    console.error('[Error] Server error:', err.message);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`=======================================================`);
  console.log(`  Frontend & Reverse Proxy: http://127.0.0.1:${PORT}/`);
  console.log(`  Connected to Backend:     http://${BACKEND_HOST}:${BACKEND_PORT}/`);
  console.log(`=======================================================`);
  ensureBackendRunning();

  // Automatically launch browser once server is confirmed to be listening
  if (process.env.NO_BROWSER !== 'true') {
    setTimeout(() => {
      const url = `http://127.0.0.1:${PORT}/`;
      const cmd = process.platform === 'win32'
        ? `start ${url}`
        : process.platform === 'darwin'
        ? `open ${url}`
        : `xdg-open ${url}`;
      exec(cmd, (e) => {
        if (!e) console.log(`[Browser] Site opened in browser: ${url}`);
      });
    }, 600);
  }
});
