#!/usr/bin/env node
/**
 * Custom wrapper untuk next dev yang memblokir WebSocket HMR.
 * Mencegah browser client dari IP publik melakukan reconnect
 * WebSocket ke HMR endpoint yang 404, yang memicu reload berulang.
 */
const { createServer } = require('node:http');
const { connect } = require('node:net');
const url = require('node:url');

const PORT = process.env.WEB_NUHA_PORT || '3226';
const NEXT_BIN = require('path').join(__dirname, '../node_modules/next/dist/bin/next');

// Spawn Next.js dev server
const { spawn } = require('child_process');
const next = spawn('node', [NEXT_BIN, 'dev', '-p', PORT, '--turbo'], {
  env: { ...process.env, TURBOPACK: '1' },
  stdio: ['ignore', 'inherit', 'inherit'],
});

// Handle graceful shutdown
process.on('SIGINT', () => { next.kill('SIGINT'); process.exit(0); });
process.on('SIGTERM', () => { next.kill('SIGTERM'); process.exit(0); });

next.on('close', (code) => {
  console.log(`[hmr-blocker] Next.js exited with code ${code}`);
  process.exit(code);
});

console.log(`[hmr-blocker] Proxying to Next.js dev on port ${PORT}`);
console.log(`[hmr-blocker] Blocking WebSocket HMR connections from public IP`);
