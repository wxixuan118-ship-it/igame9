// Static server for dist/ — used in production (npm start) and for local preview.
//   node serve.mjs [port] [--dir path] [--dev]
// Port: argument, else $PORT, else 3000. --dev disables caching for local iteration.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const dirArg = args.indexOf('--dir');
const DIST = dirArg > -1 ? path.resolve(args[dirArg + 1]) : path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const portArg = args.find((a) => /^\d+$/.test(a));
const PORT = Number(portArg || process.env.PORT || 3000);
const DEV = args.includes('--dev');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.mjs', '.json', '.webmanifest', '.svg', '.xml', '.txt']);

// CSS/JS URLs carry ?v=<content hash>, so they can be cached forever; HTML must revalidate.
function cacheControl(urlPath, ext) {
  if (DEV) return 'no-store';
  if (ext === '.html') return 'public, max-age=0, must-revalidate';
  if (urlPath.startsWith('/assets/css/') || urlPath.startsWith('/assets/js/')) return 'public, max-age=31536000, immutable';
  if (urlPath.startsWith('/assets/img/')) return 'public, max-age=604800';
  return 'public, max-age=3600';
}

const gzCache = new Map(); // file -> { mtimeMs, buf }
function gzipped(file, stat) {
  const hit = gzCache.get(file);
  if (hit && hit.mtimeMs === stat.mtimeMs) return hit.buf;
  const buf = zlib.gzipSync(fs.readFileSync(file), { level: 9 });
  gzCache.set(file, { mtimeMs: stat.mtimeMs, buf });
  return buf;
}

function resolveFile(urlPath) {
  const file = path.join(DIST, path.normalize(urlPath));
  const rel = path.relative(DIST, file);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return file;
}

http
  .createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    let url;
    let urlPath;
    try {
      url = new URL(req.url, 'http://x');
      urlPath = decodeURIComponent(url.pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    let file = resolveFile(urlPath.endsWith('/') ? urlPath + 'index.html' : urlPath);
    if (!file) {
      res.writeHead(403).end();
      return;
    }
    let stat = fs.existsSync(file) ? fs.statSync(file) : null;
    if (stat && stat.isDirectory()) {
      res.writeHead(301, { Location: url.pathname + '/' + url.search }).end();
      return;
    }
    let status = 200;
    if (!stat) {
      status = 404;
      file = path.join(DIST, '404.html');
      stat = fs.existsSync(file) ? fs.statSync(file) : null;
      if (!stat) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
        return;
      }
    }
    const ext = path.extname(file);
    const headers = {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Cache-Control': status === 200 ? cacheControl(urlPath, ext) : 'no-store',
      'Last-Modified': stat.mtime.toUTCString(),
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    };
    if (status === 200 && !DEV) {
      const since = Date.parse(req.headers['if-modified-since'] || '');
      if (since && Math.floor(stat.mtimeMs / 1000) * 1000 <= since) {
        res.writeHead(304, headers).end();
        return;
      }
    }
    if (COMPRESSIBLE.has(ext)) {
      headers.Vary = 'Accept-Encoding';
      if (/\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
        const buf = gzipped(file, stat);
        headers['Content-Encoding'] = 'gzip';
        headers['Content-Length'] = buf.length;
        res.writeHead(status, headers);
        res.end(req.method === 'HEAD' ? undefined : buf);
        return;
      }
    }
    headers['Content-Length'] = stat.size;
    res.writeHead(status, headers);
    if (req.method === 'HEAD') res.end();
    else fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, () => console.log(`igame9 serving ${path.relative(process.cwd(), DIST) || DIST} → http://localhost:${PORT}/${DEV ? ' (dev, no cache)' : ''}`));
