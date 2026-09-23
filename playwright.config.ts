import { defineConfig, devices } from '@playwright/test';

/**
 * Verifikasi Playwright untuk modul baru (Rekrutmen, Sarpras, Presensi).
 *
 * CLAUDE.md mewajibkan verifikasi lewat IP publik (http://202.59.200.26:3226)
 * karena localhost pernah meloloskan bug kuki. Sesi kerja INI berjalan di
 * sandbox terisolasi tanpa akses ke IP publik itu, jadi baseURL sengaja
 * localhost — disepakati dengan pengguna sebagai pengganti untuk sandbox ini.
 * localhost dianggap "secure context" oleh Chromium, jadi API kamera/geolokasi
 * tetap bisa diuji dengan flag device palsu tanpa HTTPS sungguhan.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3226',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          // Sandbox ini pin chromium-1194, beda dari yang diharapkan versi
          // @playwright/test terpasang — pakai binary yang sudah ada, jangan
          // `playwright install` (lihat catatan lingkungan sesi).
          executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
          args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
        },
        permissions: ['camera', 'geolocation'],
      },
    },
  ],
});
