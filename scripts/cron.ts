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
import { kirimWa } from '@/lib/wa';
import { sapuPresensi } from '@/lib/presensi/cron';

const INTERVAL_TICK_MS = 60_000;

// 01-fondasi §2.1: baris login_attempts tidak perlu Redis TTL, cukup disapu
// tiap jam oleh cron yang sudah ada. Dijalankan sekali per jam (menit ke-0),
// bukan tiap tick, supaya tidak menambah beban tulis tiap 60 detik.
async function bersihkanLoginAttempts(): Promise<void> {
  if (new Date().getMinutes() !== 0) return;
  try {
    const batas = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { count } = await prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: batas } } });
    if (count > 0) log('info', 'Bersihkan login_attempts kedaluwarsa', { jumlah: count });
  } catch (error) {
    log('error', 'Bersihkan login_attempts gagal', { error: error instanceof Error ? error.message : String(error) });
  }
}

// 03-rekrutmen §3: lowongan Open yang lewat closeAt ditutup otomatis supaya
// panitia tidak perlu mengecek tanggal manual tiap hari. Dijalankan tiap tick
// (bukan sekali sejam) karena murah — hanya UPDATE baris yang lewat batas.
async function tutupLowonganKedaluwarsa(): Promise<void> {
  try {
    const { count } = await prisma.jobPosting.updateMany({
      where: { status: 'Open', closeAt: { lt: new Date() } },
      data: { status: 'Closed' },
    });
    if (count > 0) log('info', 'Tutup lowongan lewat tenggat', { jumlah: count });
  } catch (error) {
    log('error', 'Tutup lowongan lewat tenggat gagal', { error: error instanceof Error ? error.message : String(error) });
  }
}

// 04-aset-sarpras §6.3/§6.4: peminjaman lewat batas → Terlambat; tugas
// pemeliharaan lewat jatuh tempo → Terlewat; pengingat H-N dicatat sekali
// (remindedAt) dan dikirim lewat WA ke petugas bila nomornya ada (WA_DRY_RUN berlaku).
async function sapuSarpras(): Promise<void> {
  try {
    const sekarang = new Date();
    const hariIni = new Date(sekarang); hariIni.setHours(0, 0, 0, 0);
    const telat = await prisma.assetLoan.updateMany({ where: { status: 'Dipinjam', endAt: { lt: sekarang } }, data: { status: 'Terlambat' } });
    const lewat = await prisma.maintenanceTask.updateMany({ where: { status: 'Terjadwal', dueDate: { lt: hariIni } }, data: { status: 'Terlewat' } });
    const calon = await prisma.maintenanceTask.findMany({ where: { status: 'Terjadwal', remindedAt: null }, include: { asset: true } });
    let diingatkan = 0;
    for (const t of calon) {
      const batas = new Date(t.dueDate.getTime() - t.remindDaysBefore * 86_400_000);
      if (batas > sekarang) continue;
      if (t.assignedTo) {
        const petugas = await prisma.user.findUnique({ where: { id: t.assignedTo }, include: { person: true } });
        if (petugas?.person.phone) {
          await kirimWa({ nomor: petugas.person.phone, tujuan: petugas.person.fullName, isi: `Pengingat pemeliharaan: ${t.title}${t.asset ? ` (${t.asset.name})` : ''} jatuh tempo ${t.dueDate.toLocaleDateString('id-ID')}.` }).catch(() => undefined);
        }
      }
      await prisma.maintenanceTask.update({ where: { id: t.id }, data: { remindedAt: sekarang } });
      diingatkan++;
    }
    if (telat.count || lewat.count || diingatkan) log('info', 'Sapu sarpras', { terlambat: telat.count, terlewat: lewat.count, diingatkan });
  } catch (error) {
    log('error', 'Sapu sarpras gagal', { error: error instanceof Error ? error.message : String(error) });
  }
}

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
  await bersihkanLoginAttempts();
  await tutupLowonganKedaluwarsa();
  await sapuSarpras();
  await sapuPresensi();
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
