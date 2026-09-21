/**
 * Perbaiki keanggotaan **MA Kelas 1 (tingkat 10) TA 2026/2027** agar berisi
 * tepat 8 santri sesuai tabel operator yang diserahkan 2026-08-29 — tabel yang
 * sama dengan sumber `import-siswa-ma-2026.ts` (gelombang 1).
 *
 * Dua penyimpangan yang ditambal di sini:
 *
 *   1. **Tiga santri gelombang 1 tercecer** (Achmad Tsaaqib, Addaafi Syar'i,
 *      Aisyah Aulia). Mereka sempat benar di MA Kelas 1, lalu tergerus kembali
 *      menjadi `unit = SMP`, `status = Alumni`, `kelasId = null`, `tahunMasuk =
 *      2023` oleh `import-alumni-smp-2025-2026.ts` yang jalan belakangan.
 *      Skrip ini mengembalikan mereka ke MA Kelas 1, `Mukim`, tahun masuk 2026.
 *
 *   2. **Tiga belas alumni SMP ikut terbawa masuk** (NIS 2026MA013..025) oleh
 *      `import-siswa-ma-2026-gelombang2.ts`. Operator menegaskan: lulus SMP
 *      tidak otomatis berarti masuk MA — alumni boleh berdiri tanpa kelas.
 *      Skrip ini mengeluarkan mereka dari rombel: kembali ke `unit = SMP`,
 *      `status = Alumni`, `kelasId = null`, `tahunMasuk = null`.
 *
 * `RiwayatPendidikan` SMP 2025/2026 ketiga-belas (dan ketiga) santri sudah ada
 * di DB, jadi tidak ada jejak jenjang yang perlu ditulis ulang di sini.
 *
 * Baris `Santri` tidak dihapus dan NIS `2026MA0xx` dibiarkan apa adanya — santri
 * yang dikeluarkan masih punya `Nilai`/`Presensi`/`NilaiUjian` hasil seed, dan
 * menghapusnya akan merusak riwayat. Yang berubah hanya penempatan.
 *
 * Idempoten: pencocokan lewat NIK (identitas terkuat), dan setiap `update`
 * menulis nilai akhir yang sama berapa kali pun dijalankan.
 *
 * Jalankan: `npm run fix:ma-kelas1-2026`
 */
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { JenisKelamin, StatusSantri } from '@prisma/client';

const AKTOR_SKRIP = { nama: 'Perbaikan rombel MA Kelas 1 2026/2027 (skrip)' };

const TA = { kode: '2026/2027', semester: 'Gasal' };
const KELAS_MA1 = { nama: 'Kelas 1', tingkat: '10' };
const TAHUN_MASUK_MA = '2026';

/**
 * NIK ke-8 santri MA Kelas 1 menurut tabel operator, urut sesuai kolom "No".
 * Ini adalah daftar tertutup: siapa pun di luar ini tidak boleh duduk di rombel.
 */
const NIK_KELAS_1 = [
  '3573031209100001', // 1 ACHMAD TSAAQIB AS-SYAWWALI
  '3573032507110005', // 2 ADDAAFI SYAR'I MUHAMMAD
  '3573025911100005', // 3 AISYAH AULIA MUTIARA PUTRI
  '1271184502110001', // 4 ERRENA TEMBANG SOSIALISTA TAZHEVA
  '5202121412100002', // 5 M. UWAIS QORNE
  '3573030705100004', // 6 MAULANA MALIK IBRAHIM
  '3514094207110003', // 7 NABILAH BILQIS NUR YASIN
  '3573036306100001', // 8 SITI MUNAWAROH
];

/**
 * Koreksi biodata yang menyimpang dari tabel operator, ditemukan saat
 * pengecekan baris-per-baris 2026-08-29. Hanya kolom yang benar-benar salah
 * yang ditulis — sisanya sudah cocok dan dibiarkan.
 */
const KOREKSI_BIODATA: Record<string, { catatan: string; data: Record<string, unknown> }> = {
  // Tabel operator: LAKI-LAKI, dan NIK-nya (digit ke-7 = "12") memang laki-laki.
  // DB telanjur "P" — kemungkinan salah ketik impor terdahulu.
  '3573031209100001': {
    catatan: 'jenis kelamin L sesuai tabel operator & pola NIK; NO. HP kosong (nomor lama milik ayah)',
    data: { gender: JenisKelamin.L, phone: null },
  },
  // No. 1–4 mengosongkan kolom NO. HP di tabel operator, tapi DB telanjur
  // menyimpan nomor **wali** di `Orang.hp` santri — ikut terbawa impor lama.
  // Nomor itu tidak hilang: tetap tersimpan di `GuardianRelation` ayah/ibu, yang
  // memang jalur kontak notifikasi. `Orang.hp` santri dikembalikan kosong.
  '3573032507110005': {
    catatan: 'kolom NO. HP kosong di tabel operator (nomor lama milik ibu)',
    data: { phone: null },
  },
  '3573025911100005': {
    catatan: 'kolom NO. HP kosong di tabel operator (nomor lama milik ibu)',
    data: { phone: null },
  },
  '1271184502110001': {
    catatan: 'kolom NO. HP kosong di tabel operator (nomor lama milik wali)',
    data: { phone: null },
  },
};

async function main() {
  const unitMa = await prisma.unit.findUniqueOrThrow({ where: { key: 'MA' } });
  const unitSmp = await prisma.unit.findUniqueOrThrow({ where: { key: 'SMP' } });

  const academicYear = await prisma.academicYear.findFirstOrThrow({
    where: { code: TA.kode, semester: TA.semester },
  });

  const kelas = await prisma.kelas.findFirstOrThrow({
    where: {
      nama: KELAS_MA1.nama,
      tingkat: KELAS_MA1.tingkat,
      unitId: unitMa.id,
      academicYearId: academicYear.id,
    },
  });

  // ── 1. Masukkan / pastikan ke-8 santri tabel operator ada di rombel ────────
  let dimasukkan = 0;
  for (const nik of NIK_KELAS_1) {
    const santri = await prisma.santri.findFirst({
      where: { person: { nik } },
      include: { person: { select: { fullName: true } } },
    });

    if (!santri) {
      throw new Error(
        `Santri dengan NIK ${nik} tidak ditemukan — jalankan dulu ` +
          '`npm run import:siswa-ma-2026`.',
      );
    }

    const sudahBenar =
      santri.unitId === unitMa.id &&
      santri.kelasId === kelas.id &&
      santri.status === StatusSantri.Aktif &&
      santri.tahunMasuk === TAHUN_MASUK_MA;

    if (sudahBenar) continue;

    await prisma.santri.update({
      where: { id: santri.id },
      data: {
        unitId: unitMa.id,
        kelasId: kelas.id,
        status: StatusSantri.Aktif,
        tahunMasuk: TAHUN_MASUK_MA,
      },
    });

    await recordAudit({
      aksi: 'perbaiki',
      entitas: 'santri',
      entitasId: String(santri.id),
      ringkasan: `${santri.person.fullName} ditempatkan di MA ${KELAS_MA1.nama} TA ${TA.kode}`,
      perubahan: {
        dari: {
          unitId: santri.unitId,
          kelasId: santri.kelasId,
          status: santri.status,
          tahunMasuk: santri.tahunMasuk,
        },
        ke: {
          unitId: unitMa.id,
          kelasId: kelas.id,
          status: StatusSantri.Aktif,
          tahunMasuk: TAHUN_MASUK_MA,
        },
      },
      aktor: AKTOR_SKRIP,
    });

    dimasukkan += 1;
    console.log(`  + ${santri.person.fullName} → MA ${KELAS_MA1.nama} TA ${TA.kode}`);
  }

  // ── 2. Keluarkan siapa pun di rombel yang bukan bagian tabel operator ─────
  const penyusup = await prisma.santri.findMany({
    where: { kelasId: kelas.id, person: { nik: { notIn: NIK_KELAS_1 } } },
    include: { person: { select: { fullName: true, nik: true } } },
  });

  for (const santri of penyusup) {
    await prisma.santri.update({
      where: { id: santri.id },
      data: {
        unitId: unitSmp.id,
        kelasId: null,
        status: StatusSantri.TidakAktif,
        tahunMasuk: null,
      },
    });

    await recordAudit({
      aksi: 'perbaiki',
      entitas: 'santri',
      entitasId: String(santri.id),
      ringkasan:
        `${santri.person.fullName} dikeluarkan dari MA ${KELAS_MA1.nama} TA ${TA.kode} ` +
        '— bukan bagian angkatan menurut tabel operator; kembali jadi alumni SMP tanpa kelas',
      perubahan: {
        dari: {
          unitId: santri.unitId,
          kelasId: santri.kelasId,
          status: santri.status,
          tahunMasuk: santri.tahunMasuk,
        },
        ke: { unitId: unitSmp.id, kelasId: null, status: StatusSantri.TidakAktif, tahunMasuk: null },
      },
      aktor: AKTOR_SKRIP,
    });

    console.log(`  - ${santri.person.fullName} (${santri.person.nik}) → alumni SMP tanpa kelas`);
  }

  // ── 3. Koreksi biodata yang menyimpang dari tabel operator ───────────────
  let dikoreksi = 0;
  for (const [nik, { catatan, data }] of Object.entries(KOREKSI_BIODATA)) {
    const orang = await prisma.person.findUnique({ where: { nik } });
    if (!orang) throw new Error(`Orang dengan NIK ${nik} tidak ditemukan.`);

    const record = orang as unknown as Record<string, unknown>;
    const sudahBenar = Object.entries(data).every(([kolom, nilai]) => record[kolom] === nilai);
    if (sudahBenar) continue;

    const sebelum = Object.fromEntries(Object.keys(data).map((kolom) => [kolom, record[kolom]]));
    await prisma.person.update({ where: { id: orang.id }, data });

    await recordAudit({
      aksi: 'perbaiki',
      entitas: 'orang',
      entitasId: String(orang.id),
      ringkasan: `Biodata ${orang.fullName} dikoreksi: ${catatan}`,
      perubahan: { dari: sebelum, ke: data },
      aktor: AKTOR_SKRIP,
    });

    dikoreksi += 1;
    console.log(`  ~ ${orang.fullName}: ${catatan}`);
  }

  const total = await prisma.santri.count({ where: { kelasId: kelas.id } });
  console.log(
    `\nSelesai: ${dimasukkan} ditempatkan, ${penyusup.length} dikeluarkan, ` +
      `${dikoreksi} biodata dikoreksi. ` +
      `MA ${KELAS_MA1.nama} TA ${TA.kode} kini berisi ${total} santri.`,
  );

  if (total !== NIK_KELAS_1.length) {
    throw new Error(
      `Jumlah akhir rombel ${total}, seharusnya ${NIK_KELAS_1.length}.`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
