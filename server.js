// Simple Node.js server for Render.com to handle SPA routing
// This ensures all routes (including /spotify/callback) serve index.html
// Uses only Node.js built-in modules - no external dependencies

import http from 'http';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { readFileSync, statSync, existsSync } from 'fs';
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
  // Parse URL - handle both http and https
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host || 'localhost';
  const url = new URL(req.url || '/', `${protocol}://${host}`);
  const pathname = url.pathname;
  
  console.log(`[Server] Request: ${req.method} ${pathname}`);
  
  // Handle static assets first (JS, CSS, images, etc.)
  if (pathname.startsWith('/assets/') || extname(pathname)) {
    const filePath = join(DIST_DIR, pathname);
    if (serveFile(filePath, res)) {
      return;
    }
  }
  
  // For all other routes (including /spotify/callback), serve index.html
  // This is the SPA routing - React Router will handle the routing client-side
  const indexPath = join(DIST_DIR, 'index.html');
  
  try {
    if (serveFile(indexPath, res)) {
      console.log(`[Server] Served index.html for route: ${pathname}`);
      return;
    }
  } catch (error) {
    console.error(`[Server] Error serving index.html:`, error);
  }

  // 404 if index.html doesn't exist
  console.error(`[Server] 404 - index.html not found at: ${indexPath}`);
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found - index.html not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Server running on port ${PORT}`);
  console.log(`[Server] Serving files from: ${DIST_DIR}`);
  console.log(`[Server] Node version: ${process.version}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Verify dist directory and index.html exist
  try {
    const indexPath = join(DIST_DIR, 'index.html');
    const indexExists = existsSync(indexPath);
    console.log(`[Server] index.html exists: ${indexExists} at ${indexPath}`);
    
    if (!indexExists) {
      console.error(`[Server] WARNING: index.html not found! Build may have failed.`);
    }
  } catch (error) {
    console.error(`[Server] Error checking files:`, error);
  }
});
