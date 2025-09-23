const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const root = path.resolve(__dirname);
const COUNTDOWN_FILE = path.join(root, 'countdown.json');
const DEFAULT_DURATION_MS = 43200 * 1000; // 12 hours

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function send(res, status, content, headers = {}) {
  res.writeHead(status, { 'Cache-Control': 'no-cache', ...headers });
  res.end(content);
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = mimeTypes[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') return send(res, 404, 'Not Found');
      return send(res, 500, 'Internal Server Error');
    }
    send(res, 200, data, { 'Content-Type': type });
  });
}

function readCountdownFromDisk() {
  try {
    if (!fs.existsSync(COUNTDOWN_FILE)) return null;
    const raw = fs.readFileSync(COUNTDOWN_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.endTimestamp !== 'number') return null;
    return parsed.endTimestamp;
  } catch (e) {
    return null;
  }
}

function writeCountdownToDisk(ts) {
  try {
    fs.writeFileSync(COUNTDOWN_FILE, JSON.stringify({ endTimestamp: ts }), 'utf8');
    return true;
  } catch (e) {
    return false;
  }
}

function ensureCountdown() {
  let ts = readCountdownFromDisk();
  if (!ts || typeof ts !== 'number' || ts <= Date.now()) {
    ts = Date.now() + DEFAULT_DURATION_MS;
    writeCountdownToDisk(ts);
  }
  return ts;
}

const server = http.createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);

    // API: persistent countdown
    if (urlPath === '/api/countdown') {
      if (req.method === 'GET') {
        const ts = ensureCountdown();
        return send(res, 200, JSON.stringify({ endTimestamp: ts }), { 'Content-Type': 'application/json' });
      }
      // allow reset via POST with JSON { reset: true } to create a new countdown
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const data = body ? JSON.parse(body) : {};
            if (data && data.reset) {
              const ts = Date.now() + DEFAULT_DURATION_MS;
              writeCountdownToDisk(ts);
              return send(res, 200, JSON.stringify({ endTimestamp: ts }), { 'Content-Type': 'application/json' });
            }
            // otherwise return current
            const ts = ensureCountdown();
            return send(res, 200, JSON.stringify({ endTimestamp: ts }), { 'Content-Type': 'application/json' });
          } catch (e) {
            return send(res, 400, JSON.stringify({ error: 'Invalid JSON' }), { 'Content-Type': 'application/json' });
          }
        });
        return;
      }
      return send(res, 405, 'Method Not Allowed');
    }

    let filePath = path.join(root, urlPath);

    if (urlPath === '/' || urlPath === '') {
      filePath = path.join(root, 'index.html');
    }

    const normalized = path.normalize(filePath);
    if (!normalized.startsWith(root)) {
      return send(res, 403, 'Forbidden');
    }

    fs.stat(normalized, (err, stats) => {
      if (err) {
        return send(res, 404, 'Not Found');
      }
      if (stats.isDirectory()) {
        const indexPath = path.join(normalized, 'index.html');
        return fs.stat(indexPath, (e2) => {
          if (e2) return send(res, 404, 'Not Found');
          serveFile(res, indexPath);
        });
      }
      serveFile(res, normalized);
    });
  } catch (e) {
    send(res, 500, 'Internal Server Error');
  }
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
