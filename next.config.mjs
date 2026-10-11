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
  basePath: '/apps',
  // Optimizer gagal fetch aset internal pada standalone+basePath (400 "isn't a valid image ... received null" untuk /assets/logo-nuha.webp) — serve file public langsung.
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: '/apps' },
  output: 'standalone',
  // Deploy aman: scripts/deploy.sh build ke distDir staging agar .next live
  // tidak terhapus di tengah jalan (penyebab error 500 saat agen bekerja).
  distDir: process.env.NEXT_DIST_DIR || '.next',
  outputFileTracingRoot: workspaceRoot,
  // Ringankan build & output standalone: pola path dinamis di lib/berkas.ts
  // (path.join STORAGE_DIR) membuat file tracing mencocokkan ~12.700 berkas
  // seisi proyek ("Overly broad patterns can lead to build performance issues
  // and over bundling") sehingga dump SQL 22 MB, tests, docs mentah, log, dan
  // skrip ops ikut tersalin ke .next/standalone di SETIAP build. Semua berkas
  // di bawah tidak dipakai runtime standalone (dump = arsip operator; tests/
  // scripts dijalankan dari checkout, bukan dari standalone), jadi aman
  // dikeluarkan dari tracing. Runtime `next start` di Althea tidak terpengaruh
  // (tracing hanya menentukan isi folder standalone).
  outputFileTracingExcludes: {
    '*': [
      './mysql-full.sql',
      './*.sql.gz',
      './*.log',
      './*.md',
      './tsconfig.tsbuildinfo',
      './tests/**/*',
      './test-results/**/*',
      './storage/**/*',
      './docs/**/*',
      './plan/**/*',
      './scripts/**/*',
      './playwright.config.ts',
      './vitest.config.mts',
    ],
  },
  turbopack: { root: workspaceRoot },
  devIndicators: false,
  // 01-fondasi §5.3: default 1 MB tidak cukup untuk unggah foto presensi/berkas
  // lamaran/dokumen aset yang dikirim sebagai FormData lewat Server Action.
  experimental: {
    serverActions: { bodySizeLimit: '6mb' },
    // Cache kompilasi Turbopack persisten di <distDir>/cache/turbopack.
    // Di Next 16.1 fitur ini belum bawaan untuk build (baru bawaan di 16.3),
    // dan deploy.sh menukar distDir setiap rilis — deploy.sh menyalin cache
    // dari .next live ke .next-staging sebelum build agar build berikutnya
    // hangat (hanya modul berubah yang dikompilasi ulang).
    turbopackFileSystemCacheForBuild: true,
  },
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
