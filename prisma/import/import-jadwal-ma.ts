/**
 * Impor `JADWAL KELAS X XI.xlsx` → `JadwalPelajaran` unit MA, kelas X & XI.
 * Berkas berisi 2 sheet dengan grid IDENTIK (baris/kolom sama persis):
 * sheet 1 = kode mata pelajaran per sel, sheet 2 = nama panggilan guru per
 * sel pada posisi yang sama — digabung per koordinat (baris, kolom).
 *
 * Kolom D..O berpasangan (hari, kelas) sesuai baris 5/6 header:
 * D=SeninX E=SeninXI F=SelasaX G=SelasaXI H=RabuX I=RabuXI J=KamisX
 * K=KamisXI L=JumatX M=JumatXI N=SabtuX O=SabtuXI. Baris berkolom B "-"
 * (Kegiatan Pagi/Istirahat/Ishoma) BUKAN jam pelajaran, dilewati. Sel mapel
 * kosong berarti tidak ada pelajaran di slot itu untuk kelas tsb — juga
 * dilewati, bukan galat.
 *
 * Nama panggilan guru WAJIB ada di `alias-guru.ts` — bila tidak, importir
 * gagal dengan pesan jelas (lihat kamus itu), sesuai aturan keras "jangan
 * buat guru baru diam-diam". Dua kasus dari data nyata sudah ditangani:
 * "B. Ifa" ditambahkan sebagai entri ke-16 (→ Kholifatun Khasanah, hasil
 * verifikasi mapel KIM/FIS — masih perlu konfirmasi client), sedangkan
 * "TKA"/"EKSTRA" masuk `KODE_BUKAN_GURU` karena keduanya kegiatan tanpa
 * pengampu tunggal sehingga `pegawaiId` dibiarkan NULL.
 *
 * Jalankan: `npm run import:jadwal-ma` (path default docs/, override --file).
 */
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { bacaXlsx, type Lembar } from './lib/xlsx';
import { namaResmiDariAlias, KODE_BUKAN_GURU } from './alias-guru';

type Galat = { posisi: string; pesan: string };
const AKTOR_SKRIP = { nama: 'Importir jadwal MA (skrip)' };

const KOLOM_HARI_KELAS: { kolom: string; hari: string; kelas: string }[] = [
  { kolom: 'D', hari: 'Senin', kelas: 'Kelas 1' }, { kolom: 'E', hari: 'Senin', kelas: 'Kelas 2' },
  { kolom: 'F', hari: 'Selasa', kelas: 'Kelas 1' }, { kolom: 'G', hari: 'Selasa', kelas: 'Kelas 2' },
  { kolom: 'H', hari: 'Rabu', kelas: 'Kelas 1' }, { kolom: 'I', hari: 'Rabu', kelas: 'Kelas 2' },
  { kolom: 'J', hari: 'Kamis', kelas: 'Kelas 1' }, { kolom: 'K', hari: 'Kamis', kelas: 'Kelas 2' },
  { kolom: 'L', hari: 'Jumat', kelas: 'Kelas 1' }, { kolom: 'M', hari: 'Jumat', kelas: 'Kelas 2' },
  { kolom: 'N', hari: 'Sabtu', kelas: 'Kelas 1' }, { kolom: 'O', hari: 'Sabtu', kelas: 'Kelas 2' },
];

type SiapJadwal = { hari: string; jamKe: number; waktu: string; kelas: string; mapel: string; guruAlias: string | null };

const bacaArgumen = (argv: string[]): Record<string, string> => {
  const hasil: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      hasil[argv[i].slice(2)] = argv[i + 1] ?? '';
      i += 1;
    }
  }
  return hasil;
};

function siapkanJadwal(mapelSheet: Lembar, guruSheet: Lembar): { siap: SiapJadwal[]; galat: Galat[] } {
  const galat: Galat[] = [];
  const siap: SiapJadwal[] = [];

  const nomorBaris = [...mapelSheet.keys()].filter((r) => r >= 7).sort((a, b) => a - b);
  for (const r of nomorBaris) {
    const rowMapel = mapelSheet.get(r)!;
    const jamKeMentah = rowMapel.B?.trim();
    const jamKe = jamKeMentah ? Number(jamKeMentah) : NaN;
    if (!Number.isInteger(jamKe) || jamKe < 1) continue; // baris "-" (kegiatan/istirahat/ishoma), bukan jam pelajaran

    const waktu = rowMapel.C?.trim() ?? '';
    const rowGuru = guruSheet.get(r) ?? {};

    for (const { kolom, hari, kelas } of KOLOM_HARI_KELAS) {
      const mapel = rowMapel[kolom]?.trim();
      if (!mapel) continue; // tidak ada pelajaran di slot ini untuk kelas ini

      const guruAlias = rowGuru[kolom]?.trim() || null;
      siap.push({ hari, jamKe, waktu, kelas, mapel, guruAlias });
    }
  }

  // Validasi seluruh alias guru dulu, kumpulkan semua yang tidak dikenal.
  for (const s of siap) {
    if (!s.guruAlias) continue;
    if (KODE_BUKAN_GURU.has(s.guruAlias)) continue; // kegiatan tanpa pengampu tunggal
    try {
      namaResmiDariAlias(s.guruAlias);
    } catch (error) {
      galat.push({ posisi: `${s.hari} kelas ${s.kelas} jam ke-${s.jamKe} (${s.mapel})`, pesan: error instanceof Error ? error.message : String(error) });
    }
  }

  return { siap, galat };
}

/**
 * Normalisasi nama untuk pencocokan. `DATA GURU.xlsx` dan kamus alias tidak
 * pernah sepenuhnya sama ejaannya, jadi bandingkan bentuk yang sudah diratakan:
 * gelar di belakang koma dibuang, apostrof lengkung (U+2019, dipakai di berkas
 * client) diseragamkan ke apostrof lurus, huruf berulang dirapatkan (data
 * client menulis "Muhammmad" dengan tiga m), dan spasi ganda dipadatkan.
 */
const ratakanNama = (nama: string): string =>
  nama
    .split(',')[0]
    .replace(/[‘’ʼ]/g, "'")
    .toLowerCase()
    .replace(/(.)\1+/g, '$1')
    .replace(/[^a-z']/g, '');

/** Cari Pegawai unit MA dari nama resmi, toleran terhadap gelar & varian ejaan. */
async function cariPegawai(unitId: number, namaResmi: string): Promise<{ id: bigint } | null> {
  const kandidat = await prisma.staff.findMany({
    where: { unitId },
    select: { id: true, person: { select: { fullName: true } } },
  });
  const target = ratakanNama(namaResmi);
  const cocok = kandidat.filter((k) => ratakanNama(k.person.fullName) === target);
  if (cocok.length === 1) return { id: cocok[0].id };
  // Nol atau lebih dari satu kecocokan sama-sama bukan hasil yang boleh
  // ditebak. Selisih ejaan yang tidak bisa diratakan (mis. singkatan "Muh."
  // vs "Muhammmad") diselesaikan dengan menambah pemetaan eksplisit di
  // `alias-guru.ts`, bukan dengan melonggarkan pencocokan di sini.
  return null;
}

async function jalankan(): Promise<void> {
  const argumen = bacaArgumen(process.argv.slice(2));
  const path = argumen.file || 'docs/JADWAL KELAS X XI.xlsx';

  const wb = bacaXlsx(path);
  if (wb.namaSheet.length < 2) {
    console.error(`"${path}": butuh minimal 2 sheet (mapel + guru), ditemukan ${wb.namaSheet.length}.`);
    process.exitCode = 1;
    return;
  }
  const sheetMapel = wb.ambilSheet(wb.namaSheet[0]);
  const sheetGuru = wb.ambilSheet(wb.namaSheet[1]);

  const { siap, galat } = siapkanJadwal(sheetMapel, sheetGuru);

  if (galat.length > 0) {
    console.error(`Ditemukan ${galat.length} galat validasi alias guru di "${path}". Tidak ada data yang ditulis ke DB.\n`);
    for (const g of galat) console.error(`  - [${g.posisi}] ${g.pesan}`);
    process.exitCode = 1;
    return;
  }

  const unit = await prisma.unit.findUniqueOrThrow({ where: { key: 'MA' } });

  console.log(`Validasi lolos: ${siap.length} slot jadwal. Menulis ke database...`);

  let ditulis = 0;
  for (const s of siap) {
    let staffId: bigint | null = null;
    if (s.guruAlias && !KODE_BUKAN_GURU.has(s.guruAlias)) {
      const namaResmi = namaResmiDariAlias(s.guruAlias);
      const pegawai = await cariPegawai(unit.id, namaResmi);
      if (!pegawai) {
        console.error(`Alias "${s.guruAlias}" → "${namaResmi}" tidak ditemukan di Pegawai unit MA — jalankan import:guru-ma dulu. Slot: ${s.hari} kelas ${s.kelas} jam ke-${s.jamKe}.`);
        process.exitCode = 1;
        await prisma.$disconnect();
        return;
      }
      staffId = pegawai.id;
    }

    await prisma.jadwalPelajaran.upsert({
      where: { hari_jamKe_kelas: { hari: s.hari, jamKe: s.jamKe, kelas: s.kelas } },
      create: { hari: s.hari, jamKe: s.jamKe, waktu: s.waktu, mapel: s.mapel, kelas: s.kelas, unitId: unit.id, staffId },
      update: { waktu: s.waktu, mapel: s.mapel, unitId: unit.id, staffId },
    });
    ditulis += 1;
  }

  await recordAudit({
    aksi: 'import',
    entitas: 'JadwalPelajaran',
    entitasId: 'batch',
    ringkasan: `Impor XLSX jadwal MA: ${ditulis} slot (${path}).`,
    aktor: AKTOR_SKRIP,
  });

  console.log(`Selesai. ${ditulis} JadwalPelajaran di-upsert.`);
}

jalankan()
  .catch((error) => {
    console.error('Galat tak terduga saat impor jadwal MA:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
