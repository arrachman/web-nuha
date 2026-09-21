import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// In the monorepo, dependencies are hoisted to the workspace root, so Turbopack
// must resolve from there — pinning it to this folder makes hoisted packages
// (react, zod, jose) unresolvable. Inside the Docker image the app is standalone
// with its own node_modules, so this folder is the correct root.
// npm partially populates a local node_modules even in the monorepo, so key the
// check on `react`, which is only installed locally in the Docker image.
const isStandaloneCheckout = existsSync(resolve(__dirname, 'node_modules/react'));
const workspaceRoot = isStandaloneCheckout ? __dirname : resolve(__dirname, '../..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: workspaceRoot,
  turbopack: { root: workspaceRoot },
  devIndicators: false,
};

const PORT = process.env.WEB_NUHA_PORT || '3226';

const defaultDevOrigins = [
  '192.168.1.150',
  `192.168.1.150:${PORT}`,
  'localhost',
  `localhost:${PORT}`,
  '127.0.0.1',
  `127.0.0.1:${PORT}`,
  'nuha.fr-labs.my.id',
];

const envDevOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

nextConfig.allowedDevOrigins = Array.from(new Set([...defaultDevOrigins, ...envDevOrigins]));

export default nextConfig;
