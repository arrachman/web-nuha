import { prisma } from '@/lib/prisma';

/**
 * Pengumpul data kartu "Kelas Saya". Dipisah dari komponennya karena satu guru
 * lazim mengampu lintas unit (SMP, MA, sekaligus diniyah pondok), sehingga
 * kueri dan pengelompokannya lebih panjang daripada markupnya.
 */

export type KartuKelas = {
  key: string;
  kelas: string;
  unit: string;
  mapel: string;
  peran: string[];
  jamPerPekan: number;
  hari: string[];
  ruang: string[];
  jumlahSiswa: number;
  kkm: number | null;
  /** Persentase santri kelas ini yang nilainya sudah masuk untuk mapel tersebut. */
  nilaiMasuk: number;
  rerataNilai: number | null;
  presensi: { hadir: number; sakit: number; izin: number; alpa: number; belum: number };
  ujianBerikut: { nama: string; tgl: Date; waktu: string; belumDinilai: number } | null;
};

export type GrupUnit = { unit: string; kartu: KartuKelas[] };

const PERIODE_AKTIF = '2026/2027 Gasal';

/** Hari ini dalam UTC tengah malam — kolom `presensi.tgl` bertipe DATE. */
const awalHariIni = () => {
  const hari = new Date();
  hari.setUTCHours(0, 0, 0, 0);
  return hari;
};

export async function ambilKelasGuru(namaGuru: string): Promise<GrupUnit[]> {
  const jadwal = await prisma.jadwalPelajaran.findMany({
    where: { guru: namaGuru, kelas: { not: null } },
    include: { unit: true },
    orderBy: [{ kelas: 'asc' }, { jamKe: 'asc' }],
  });
  if (jadwal.length === 0) return [];

  const [mapelSemua, kelasSemua] = await Promise.all([
    prisma.mataPelajaran.findMany(),
    prisma.kelas.findMany({ include: { unit: true, santri: { select: { id: true } } } }),
  ]);

  // Satu kartu = satu kombinasi kelas + mapel; barisnya digabung supaya jumlah
  // jam, hari, dan ruang terlihat utuh alih-alih terpecah per jam pelajaran.
  const grup = new Map<string, typeof jadwal>();
  for (const baris of jadwal) {
    const key = `${baris.kelas}|${baris.mapel}`;
    grup.set(key, [...(grup.get(key) ?? []), baris]);
  }

  const hariIni = awalHariIni();
  const kartu = await Promise.all([...grup.entries()].map(async ([key, baris]) => {
    const contoh = baris[0];
    const kelas = kelasSemua.find((k) => k.nama === contoh.kelas);
    const mapel = mapelSemua.find((m) => m.nama === contoh.mapel);
    const siswaIds = kelas?.santri.map((s) => s.id) ?? [];

    const peran: string[] = [];
    if (kelas?.waliKelas === namaGuru) peran.push('Wali Kelas');
    if (contoh.unit?.key === 'Pondok') peran.push('Ustadz Diniyah');

    let nilaiMasuk = 0;
    let rerataNilai: number | null = null;
    if (mapel && siswaIds.length > 0) {
      // Dibatasi periode berjalan: tanpa itu nilai semester lalu ikut terhitung
      // dan kelengkapannya bisa melewati 100%.
      const nilai = await prisma.nilai.findMany({
        where: { mapelId: mapel.id, santriId: { in: siswaIds }, periode: PERIODE_AKTIF },
        select: { akhir: true },
      });
      nilaiMasuk = Math.min(100, Math.round((nilai.length / siswaIds.length) * 100));
      if (nilai.length > 0) {
        rerataNilai = nilai.reduce((total, n) => total + Number(n.akhir), 0) / nilai.length;
      }
    }

    const presensi = { hadir: 0, sakit: 0, izin: 0, alpa: 0, belum: siswaIds.length };
    if (siswaIds.length > 0) {
      const rekap = await prisma.attendance.groupBy({
        by: ['status'],
        where: { studentId: { in: siswaIds }, date: hariIni },
        _count: { status: true },
      });
      for (const baris of rekap) {
        const jumlah = baris._count.status;
        if (baris.status === 'Present') presensi.hadir = jumlah;
        else if (baris.status === 'Sick') presensi.sakit = jumlah;
        else if (baris.status === 'Excused') presensi.izin = jumlah;
        else presensi.alpa = jumlah;
        presensi.belum -= jumlah;
      }
    }

    let ujianBerikut: KartuKelas['ujianBerikut'] = null;
    if (mapel && kelas) {
      const sesi = await prisma.jadwalUjian.findFirst({
        where: { mapelId: mapel.id, kelasId: kelas.id, ujian: { status: { not: 'Selesai' } } },
        include: { ujian: true, _count: { select: { nilai: true } } },
        orderBy: { tgl: 'asc' },
      });
      if (sesi) {
        ujianBerikut = {
          nama: sesi.ujian.nama,
          tgl: sesi.tgl,
          waktu: sesi.waktu,
          belumDinilai: Math.max(0, siswaIds.length - sesi._count.nilai),
        };
      }
    }

    return {
      key,
      kelas: contoh.kelas ?? '-',
      unit: contoh.unit?.nama ?? kelas?.unit.nama ?? 'Tanpa unit',
      mapel: contoh.mapel,
      peran,
      jamPerPekan: baris.length,
      hari: [...new Set(baris.map((b) => b.hari))],
      ruang: [...new Set(baris.map((b) => b.ruang ?? 'Ruang kelas'))],
      jumlahSiswa: siswaIds.length,
      kkm: mapel?.kkm ?? null,
      nilaiMasuk,
      rerataNilai,
      presensi,
      ujianBerikut,
    };
  }));

  const perUnit = new Map<string, KartuKelas[]>();
  for (const item of kartu) perUnit.set(item.unit, [...(perUnit.get(item.unit) ?? []), item]);

  return [...perUnit.entries()]
    .map(([unit, daftar]) => ({ unit, kartu: daftar.sort((a, b) => a.kelas.localeCompare(b.kelas)) }))
    .sort((a, b) => a.unit.localeCompare(b.unit));
}
