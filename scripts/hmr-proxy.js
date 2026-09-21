#!/usr/bin/env node
/**
 * Custom proxy untuk Next.js dev server.
 * - Meneruskan semua request HTTP biasa ke Next.js
 * - Menolak WebSocket upgrade ke HMR endpoint (/_next/webpack-hmr)
 *   dengan menutup koneksi segera agar browser tidak retry
 *
 * Ini mencegah reload berulang (~5s) saat diakses dari IP publik.
 */
const http = require('node:http');
const net = require('node:net');
const url = require('node:url');

const PORT = parseInt(process.env.WEB_NUHA_PORT || '3226', 10);
const NEXT_PORT = PORT + 1; // Next.js dev server berjalan di port berikutnya

// Start Next.js dev server on NEXT_PORT
const { spawn } = require('child_process');
const path = require('node:path');

const next = spawn('node', [
  path.join(__dirname, '../node_modules/next/dist/bin/next'),
  'dev',
  '-p', NEXT_PORT,
  '--turbo'
], {
  env: { ...process.env, TURBOPACK: '1' },
  stdio: ['ignore', 'inherit', 'inherit'],
});

console.log(`[hmr-proxy] Next.js dev server started on port ${NEXT_PORT}`);
console.log(`[hmr-proxy] Proxy listening on port ${PORT}`);
console.log(`[hmr-proxy] Blocking WebSocket HMR from public access`);

// Handle graceful shutdown
process.on('SIGINT', () => { next.kill('SIGINT'); process.exit(0); });
process.on('SIGTERM', () => { next.kill('SIGTERM'); process.exit(0); });

next.on('close', (code) => {
  console.log(`[hmr-proxy] Next.js exited with code ${code}`);
  process.exit(code || 1);
});

next.on('error', (err) => {
  console.error('[hmr-proxy] Failed to start Next.js:', err.message);
  process.exit(1);
});

// Create proxy server
const proxy = http.createServer((req, res) => {
  // Proxy regular HTTP requests
  const proxyReq = http.request({
    hostname: '127.0.0.1',
    port: NEXT_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `localhost:${NEXT_PORT}` },
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('[hmr-proxy] Proxy error:', err.message);
    res.writeHead(502);
    res.end('Bad Gateway');
  });

  req.pipe(proxyReq, { end: true });
});

// Handle WebSocket upgrades
proxy.on('upgrade', (req, socket, head) => {
  const parsedUrl = url.parse(req.url);

  // Block WebSocket connections to HMR endpoint
  if (parsedUrl.pathname === '/_next/webpack-hmr') {
    console.log('[hmr-proxy] Blocked WebSocket HMR connection from', req.headers['x-forwarded-for'] || socket.remoteAddress);
    socket.write('HTTP/1.1 400 Bad Request\r\nContent-Type: text/plain\r\n\r\nHMR unavailable\n');
    socket.end();
    return;
  }

  // Allow other WebSocket upgrades (for future use)
  socket.write('HTTP/1.1 101 Switching Protocols\r\n\r\n');
  socket.end();
});

proxy.listen(PORT, '0.0.0.0', () => {
  console.log(`[hmr-proxy] Proxy server listening on port ${PORT}`);
});
