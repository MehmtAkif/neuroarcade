import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const START_PORT = Number(process.env.PORT || 5173);
const MAX_PORT = START_PORT + 25;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

function createServer() {
  return http.createServer((req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      let pathname = decodeURIComponent(url.pathname);
      if (pathname === '/') pathname = '/index.html';

      const safePath = path.normalize(path.join(ROOT, pathname));
      if (!safePath.startsWith(ROOT)) {
        res.writeHead(403); res.end('Forbidden'); return;
      }

      fs.stat(safePath, (err, stat) => {
        if (!err && stat.isFile()) {
          res.writeHead(200, {
            'Content-Type': MIME[path.extname(safePath).toLowerCase()] || 'application/octet-stream',
            'Cache-Control': 'no-store'
          });
          fs.createReadStream(safePath).pipe(res);
          return;
        }

        const fallback = path.join(ROOT, 'index.html');
        fs.readFile(fallback, (readErr, data) => {
          if (readErr) {
            res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'});
            res.end('Not found');
            return;
          }
          res.writeHead(200, {'Content-Type': MIME['.html'], 'Cache-Control':'no-store'});
          res.end(data);
        });
      });
    } catch (err) {
      res.writeHead(400, {'Content-Type':'text/plain; charset=utf-8'});
      res.end('Bad request');
    }
  });
}

function openBrowser(url) {
  try {
    if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
    } else if (process.platform === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
    }
  } catch {}
}

function listen(port) {
  const server = createServer();
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE' && port < MAX_PORT) {
      console.log(`Port ${port} dolu, ${port + 1} deneniyor...`);
      server.close();
      listen(port + 1);
      return;
    }
    console.error('Sunucu başlatılamadı:', err.message);
    process.exitCode = 1;
  });

  server.listen(port, '127.0.0.1', () => {
    const url = `http://localhost:${port}`;
    console.log(`\nNeuroArcade çalışıyor: ${url}`);
    console.log('Tarayıcı otomatik açılıyor.');
    console.log('Kapatmak için Ctrl+C.\n');
    openBrowser(url);
  });
}

listen(START_PORT);
