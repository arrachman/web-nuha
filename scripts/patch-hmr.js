#!/usr/bin/env node
/**
 * Patch Next.js HMR client untuk mencegah reload berulang
 * saat diakses dari IP publik (bukan localhost).
 */
const fs = require('fs');
const path = require('path');

const WS_FILE = path.join(__dirname, '../node_modules/next/dist/client/dev/hot-reloader/app/web-socket.js');

if (!fs.existsSync(WS_FILE)) {
  console.error('[patch-hmr] File not found:', WS_FILE);
  process.exit(1);
}

let content = fs.readFileSync(WS_FILE, 'utf8');

// Check if already patched
if (content.includes('// PATCHED: Disable HMR reconnect')) {
  console.log('[patch-hmr] Already patched, skipping');
  process.exit(0);
}

// Apply patch: replace reconnect timeout with early return
const original = 'timer = setTimeout(init, reconnections > 5 ? 5000 : 1000);';
const replacement = `// PATCHED: Disable HMR reconnect to prevent reload loop from public IP
            console.warn("[HMR] Disabling reconnect - HMR not available from public IP");
            return;`;

if (!content.includes(original)) {
  console.error('[patch-hmr] Could not find target code to patch');
  process.exit(1);
}

content = content.replace(original, replacement);
fs.writeFileSync(WS_FILE, content);
console.log('[patch-hmr] Patched successfully');
