/**
 * Entry point proses `nuha-cron` — penjadwal notifikasi WA.
 *
 * SENGAJA proses Node terpisah dari `nuha-app` (bukan setInterval di dalam
 * Next.js): `nuha-app` pakai `output: 'standalone'` dan bisa dijalankan
 * lebih dari satu instans (mis. saat scale horizontal), yang berarti
 * setInterval di app akan memicu pengiriman WA ganda dari tiap instans.
 * Satu proses cron = satu sumber kebenaran jadwal.
 *
 * Mode:
 *   npx tsx scripts/cron.ts            → satu kali tick, lalu keluar
 *                                          (dipakai `docker compose run`
 *                                          atau verifikasi manual dari host)
 *   npx tsx scripts/cron.ts --loop      → jalan terus, tick tiap 60 detik
 *                                          (dipakai service `nuha-cron`)
 */
import { jalankanTick } from '@/lib/penjadwal/jalankan';
import { log } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

const INTERVAL_TICK_MS = 60_000;

async function satuTick(): Promise<void> {
  try {
    const ringkasan = await jalankanTick();
    log('info', 'Tick penjadwal selesai', {
      waktuWib: ringkasan.waktu,
      jumlahJobCocok: ringkasan.jobs.length,
      jobs: ringkasan.jobs,
    });
  } catch (error) {
    log('error', 'Tick penjadwal gagal', { error: error instanceof Error ? error.message : String(error) });
  }
}

async function main(): Promise<void> {
  const loop = process.argv.includes('--loop');

  if (!loop) {
    await satuTick();
    await prisma.$disconnect();
    return;
  }

  log('info', 'nuha-cron dimulai (mode loop, tick tiap 60 detik)');
  // Tick pertama langsung, tidak menunggu interval penuh — supaya restart
  // proses tidak kehilangan satu window menit penuh.
  await satuTick();
  setInterval(() => {
    void satuTick();
  }, INTERVAL_TICK_MS);
}

main().catch((error) => {
  log('error', 'nuha-cron berhenti karena galat tak tertangani', { error: error instanceof Error ? error.message : String(error) });
  process.exitCode = 1;
});
