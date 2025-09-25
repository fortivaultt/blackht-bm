const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const root = path.resolve(__dirname);
const ASSETS_DIR = path.join(root, 'assets');
const MANIFEST_FILE = path.join(ASSETS_DIR, 'manifest.json');
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
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function ensureAssetsDir() {
  try { fs.mkdirSync(ASSETS_DIR, { recursive: true }); } catch (e) {}
}

function send(res, status, content, headers = {}) {
  // Security headers
  const securityHeaders = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': "geolocation=(), microphone=(), camera=()",
    // HSTS (only meaningful over HTTPS, harmless otherwise)
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    // Content Security Policy: restrict to self, allow frame for known external iframe host
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; connect-src 'self'; frame-src 'self' https://go.screenpal.com;",
    ...headers
  };
  res.writeHead(status, securityHeaders);
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

// Asset downloader & manifest builder
function safeExtFromContentType(ct) {
  if (!ct) return '.bin';
  ct = ct.split(';')[0].trim().toLowerCase();
  if (ct === 'video/mp4') return '.mp4';
  if (ct === 'image/webp') return '.webp';
  if (ct === 'image/jpeg') return '.jpg';
  if (ct === 'image/png') return '.png';
  if (ct === 'image/svg+xml') return '.svg';
  return '.bin';
}

function filenameForUrl(url, ext) {
  const hash = crypto.createHash('sha1').update(url).digest('hex');
  return `${hash}${ext}`;
}

function downloadUrlToAssets(url, destPath) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const client = u.protocol === 'https:' ? https : http;
      const req = client.get(u, (res) => {
        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          res.resume();
          return resolve({ ok: false });
        }
        const ct = res.headers['content-type'];
        const ext = path.extname(u.pathname) || safeExtFromContentType(ct);
        const fname = filenameForUrl(url, ext);
        const full = path.join(ASSETS_DIR, fname);
        const fileStream = fs.createWriteStream(full);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          try { fileStream.close(); } catch (e) {}
          resolve({ ok: true, path: `/assets/${fname}`, file: full });
        });
        fileStream.on('error', () => resolve({ ok: false }));
      });
      req.on('error', () => resolve({ ok: false }));
    } catch (e) { resolve({ ok: false }); }
  });
}

function buildAssetManifestFromHtml(html) {
  ensureAssetsDir();
  const urls = new Set();
  const regex = /https:\/\/[^"'\s]+cdn\.builder\.io[^"'\s]*/g;
  let m;
  while ((m = regex.exec(html)) !== null) urls.add(m[0]);

  // also catch builder.io api image urls
  const regex2 = /https:\/\/[^"'\s]*builder\.io[^"'\s]*/g;
  while ((m = regex2.exec(html)) !== null) urls.add(m[0]);

  const manifest = {};
  const promises = Array.from(urls).map(async (url) => {
    const r = await downloadUrlToAssets(url);
    if (r.ok && r.path) {
      manifest[url] = r.path;
    }
  });
  return Promise.all(promises).then(() => {
    try { fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8'); } catch (e) {}
    return manifest;
  });
}

function loadManifest() {
  try {
    if (!fs.existsSync(MANIFEST_FILE)) return {};
    const raw = fs.readFileSync(MANIFEST_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) { return {}; }
}

function stripSensitiveMetaAndRewrite(html, manifest) {
  // Remove structured data blocks (ld+json) to avoid embedding publisher info
  html = html.replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/gi, '');

  // Remove geo.* meta tags and publisher meta
  html = html.replace(/<meta[^>]*(name|property)=["']?(geo\.[^"'\s>]+|og:locale|publisher)["']?[^>]*>/gi, '');

  // Insert robots meta to discourage indexing
  html = html.replace(/<head[^>]*>/i, match => `${match}\n  <meta name="robots" content="noindex, nofollow">`);

  // Replace remote asset URLs with local cached assets when available
  Object.keys(manifest).forEach(remote => {
    const local = manifest[remote];
    // replace exact occurrences (may include query strings)
    html = html.split(remote).join(local);
    // also try without querystring
    try {
      const urlObj = new URL(remote);
      const withoutQ = urlObj.origin + urlObj.pathname;
      html = html.split(withoutQ).join(local);
    } catch (e) {}
  });

  return html;
}

// Prepare assets manifest at startup by reading index.html
let ASSET_MANIFEST = {};
try {
  const rawIndex = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  buildAssetManifestFromHtml(rawIndex).then((m) => {
    ASSET_MANIFEST = Object.assign({}, loadManifest(), m || {});
  }).catch(() => { ASSET_MANIFEST = loadManifest(); });
} catch (e) { ASSET_MANIFEST = loadManifest(); }

// Ensure robots.txt exists
try {
  fs.writeFileSync(path.join(root, 'robots.txt'), 'User-agent: *\nDisallow: /\n', 'utf8');
} catch (e) {}

const server = http.createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);

    // API: persistent countdown
    if (urlPath === '/api/countdown') {
      if (req.method === 'GET') {
        const ts = ensureCountdown();
        return send(res, 200, JSON.stringify({ endTimestamp: ts }), { 'Content-Type': 'application/json' });
      }
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
            if (data && typeof data.endTimestamp === 'number' && data.endTimestamp > Date.now()) {
              writeCountdownToDisk(data.endTimestamp);
              return send(res, 200, JSON.stringify({ endTimestamp: data.endTimestamp }), { 'Content-Type': 'application/json' });
            }
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
      // Serve transformed index.html on the fly (strip metadata and rewrite assets)
      try {
        const raw = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
        const manifest = ASSET_MANIFEST || loadManifest();
        const transformed = stripSensitiveMetaAndRewrite(raw, manifest);
        return send(res, 200, transformed, { 'Content-Type': mimeTypes['.html'] });
      } catch (e) {
        return send(res, 500, 'Internal Server Error');
      }
    }

    const normalized = path.normalize(filePath);
    if (!normalized.startsWith(root)) {
      return send(res, 403, 'Forbidden');
    }

    fs.stat(normalized, (err, stats) => {
      if (err) return send(res, 404, 'Not Found');
      if (stats.isDirectory()) {
        const indexPath = path.join(normalized, 'index.html');
        return fs.stat(indexPath, (e2) => {
          if (e2) return send(res, 404, 'Not Found');
          // Serve static index normally (no transform)
          serveFile(res, indexPath);
        });
      }
      // Serve existing static asset
      serveFile(res, normalized);
    });
  } catch (e) {
    send(res, 500, 'Internal Server Error');
  }
});

server.listen(port, () => {
  // Intentionally do not log request details or IPs to disk/console
  console.log(`Server running at http://localhost:${port}`);
});
