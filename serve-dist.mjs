import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'docs');
const port = process.env.PORT || 4173;
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    const filePath = join(root, pathname);
    const stats = await stat(filePath);

    const finalPath = stats.isDirectory() ? join(filePath, 'index.html') : filePath;
    const data = await readFile(finalPath);
    const ext = extname(finalPath);
    const contentType = mime[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch (err) {
    try {
      const data = await readFile(join(root, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Unable to load dist/index.html');
    }
  }
});

server.listen(port, () => {
  console.log(`Serving dist on http://localhost:${port}`);
});
