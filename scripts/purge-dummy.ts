/**
 * Menghapus seluruh data operasional contoh (hasil `prisma/seed.ts` dari
 * `proto-data.json`) agar basis data siap diisi data nyata.
 *
 * Yang DIPERTAHANKAN — supaya aplikasi tetap bisa dipakai tanpa setup ulang:
 *  - RBAC: `peran`, `menu`, `menu_peran`
 *  - Master: `unit`, `kelas`, `tahun_ajaran`, `asrama`, `kamar`,
 *    `mata_pelajaran`, `komponen_gaji`, `template_wa`, `jadwal_notifikasi`
 *  - Akun `superadmin` beserta `orang` dan `user_peran`-nya
 *
 * Jalankan: `npm run db:purge-dummy -- --yakin`
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SUPERADMIN_EMAIL = 'superadmin@nuha.pesantren.web.id';

/** Urutan tidak penting: pengecekan foreign key dimatikan sementara. */
const TABEL_OPERASIONAL = [
  'log_kecurangan', 'jawaban_peserta', 'peserta_cbt', 'sesi_cbt', 'butir_paket',
  'paket_soal', 'opsi_soal', 'soal', 'bank_soal',
  'nilai_ujian', 'jadwal_ujian', 'ujian',
  'tugas_lms', 'materi_lms', 'kursus_lms',
  'capaian_pembelajaran', 'perangkat_ajar', 'nilai', 'presensi',
  'jurnal_mengajar', 'beban_jam', 'jadwal_piket', 'jadwal_pelajaran',
  'jadwal_diniyah', 'kegiatan_harian',
  'hafalan', 'halaqah', 'tazir', 'izin', 'kunjungan',
  'rekam_medis', 'obat', 'profil_kesehatan',
  'pembayaran', 'tagihan', 'transaksi_kas', 'slip_gaji',
  'berkas_pendaftar', 'pendaftar',
  'presensi_pegawai', 'arsip_sk', 'jabatan_struktural', 'pegawai',
  'antrean_notifikasi', 'log_wa', 'pengumuman', 'agenda',
  'relasi_wali', 'santri',
  'audit_log',
];

async function main() {
  if (!process.argv.includes('--yakin')) {
    console.error('Batal: tambahkan flag --yakin untuk benar-benar menghapus data.');
    process.exit(1);
  }

  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
  try {
    for (const tabel of TABEL_OPERASIONAL) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${tabel}\``);
      console.log(`kosong: ${tabel}`);
    }

    // Sisakan hanya akun super admin; user & orang lain ikut terhapus.
    const superadmin = await prisma.person.findUnique({ where: { email: SUPERADMIN_EMAIL } });
    if (!superadmin) throw new Error(`Akun ${SUPERADMIN_EMAIL} tidak ditemukan — pembersihan dibatalkan agar tidak ada DB tanpa admin.`);

    const dihapusUser = await prisma.user.deleteMany({ where: { personId: { not: superadmin.id } } });
    const dihapusOrang = await prisma.person.deleteMany({ where: { id: { not: superadmin.id } } });
    console.log(`user dihapus: ${dihapusUser.count}, orang dihapus: ${dihapusOrang.count}`);
  } finally {
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
  }

  console.log('Selesai. RBAC, master data, dan akun superadmin dipertahankan.');
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
