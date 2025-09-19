const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const root = path.resolve(__dirname);

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

const server = http.createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
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
