// Simple Node.js server for Render.com to handle SPA routing
// This ensures all routes (including /spotify/callback) serve index.html
// Uses only Node.js built-in modules - no external dependencies

import http from 'http';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { readFileSync, statSync } from 'fs';
import { createReadStream } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3002;
const DIST_DIR = join(__dirname, 'dist');

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm',
};

function getContentType(filePath) {
  const ext = extname(filePath).toLowerCase();
  return mimeTypes[ext] || 'application/octet-stream';
}

function serveFile(filePath, res) {
  try {
    const stats = statSync(filePath);
    if (!stats.isFile()) {
      return false;
    }

    const contentType = getContentType(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    
    const stream = createReadStream(filePath);
    stream.pipe(res);
    return true;
  } catch (error) {
    return false;
  }
}

const server = http.createServer((req, res) => {
  // Parse URL
  const url = new URL(req.url, `http://${req.headers.host}`);
  let filePath = join(DIST_DIR, url.pathname === '/' ? 'index.html' : url.pathname);

  // Try to serve the requested file
  if (serveFile(filePath, res)) {
    return;
  }

  // If file doesn't exist and it's not a root path, try as directory
  if (url.pathname !== '/' && !extname(filePath)) {
    filePath = join(filePath, 'index.html');
    if (serveFile(filePath, res)) {
      return;
    }
  }

  // For SPA routing - serve index.html for all routes
  // This ensures /spotify/callback and other routes work
  const indexPath = join(DIST_DIR, 'index.html');
  if (serveFile(indexPath, res)) {
    return;
  }

  // 404 if index.html doesn't exist
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Serving files from: ${DIST_DIR}`);
});
