import { prisma } from '@/lib/prisma';
import { whereFilter, type FilterInduk } from './filter';

export type SimpulKelas = { id: number; nama: string; jumlah: number };
export type SimpulTingkat = { tingkat: string; label: string; jumlah: number; kelas: SimpulKelas[] };
export type SimpulUnit = { id: number; nama: string; jumlah: number; tingkat: SimpulTingkat[]; alumni: number };

/** Urutan tampil lembaga di pohon: SMP lebih dulu, lalu MA, lalu Madin. */
const URUTAN_UNIT = ['SMP', 'MA', 'Madin'];

/** Label tingkat per unit — SMP & MA memakai angka romawi tingkat sekolah,
 * Madin memakai jenjang diniyah I'dad + I–VI (I'dad = kelas persiapan, tingkat '0'
 * supaya selalu terurut paling depan). Unit lain memakai angka tingkat apa adanya. */
const LABEL_TINGKAT: Record<string, Record<string, string>> = {
  SMP: { '7': 'Tingkat VII', '8': 'Tingkat VIII', '9': 'Tingkat IX' },
  MA: { '10': 'Tingkat X', '11': 'Tingkat XI', '12': 'Tingkat XII' },
  Madin: {
    '0': "Tingkat I'dad",
    '1': 'Tingkat I',
    '2': 'Tingkat II',
    '3': 'Tingkat III',
    '4': 'Tingkat IV',
    '5': 'Tingkat V',
    '6': 'Tingkat VI',
  },
};

function labelTingkat(unitNama: string, tingkat: string): string {
  return LABEL_TINGKAT[unitNama]?.[tingkat] ?? `Tingkat ${tingkat}`;
}

export type PohonInduk = {
  total: number;
  tanpaKelas: number;
  unit: SimpulUnit[];
};

/** Unit yang tampil di pohon (Poskestren dikecualikan — layanan kesehatan,
 * bukan jenjang). Dipakai juga sebagai daftar unit untuk syarat "lulusan lembaga
 * mana pun": alumni harus diperiksa per unit, karena seseorang bisa beralumni di
 * satu lembaga sambil masih aktif di lembaga lain. */
export async function unitIdsPohon(): Promise<number[]> {
  const rows = await prisma.unit.findMany({
    where: { aktif: true, key: { not: 'Poskestren' } },
    select: { id: true },
  });
  return rows.map((u) => u.id);
}

/** Susunan lembaga → tingkat → kelas beserta cacah santri.
 * Cacah menghormati filter selain unit/kelas (status, JK, angkatan, pencarian),
 * supaya angka di pohon = angka yang benar-benar akan muncul saat simpul diklik. */
export async function ambilPohon(f: FilterInduk): Promise<PohonInduk> {
  const unitIds = await unitIdsPohon();
  const whereDasar = whereFilter({ ...f, unitId: undefined, kelasId: undefined, alumniUnitId: undefined }, { unitIds });
  // Lulusan dicacah **per lembaga saja**, tidak per tingkat/kelas: keanggotaan
  // alumni berasal dari `RiwayatPendidikan`, sedangkan tingkat/kelas di pohon
  // menggambarkan penempatan rombel santri aktif. Menampilkan keduanya bersamaan
  // memunculkan angka yang menyesatkan — mis. lulusan SMP yang kini aktif di MA
  // ikut terhitung di "MA Tingkat X", padahal cabang itu bukan jawaban dari
  // pertanyaan "lulusan lembaga mana".
  const modeLulusan = typeof f.alumniUnitId === 'number';

  const [unitRows, kelasRows, cacah, total, tanpaKelas] = await Promise.all([
    // Poskestren bukan lembaga tempat santri terdaftar (layanan kesehatan,
    // bukan jenjang) — dikeluarkan dari pohon induk santri.
    prisma.unit.findMany({ where: { aktif: true, key: { not: 'Poskestren' } } }),
    // Hanya kelas **tahun ajaran aktif**: satu rombel yang sama punya baris
    // `Kelas` sendiri di tiap TA, jadi tanpa saringan ini setiap tingkat tampil
    // ganda (mis. "Kelas 6" dua kali — TA lama dan TA aktif). Sejarah rombel
    // tetap dibaca dari `RiwayatPendidikan`, bukan dari pohon ini.
    prisma.kelas.findMany({
      where: { academicYear: { isActive: true } },
      orderBy: [{ tingkat: 'asc' }, { nama: 'asc' }],
    }),
    // Dicacah dari `SantriKelas` supaya santri berkelas jamak (mis. SMP + Madin)
    // terhitung di kedua cabang lembaga, bukan hanya di penempatan utamanya.
    prisma.santriKelas.groupBy({ by: ['kelasId'], where: { santri: whereDasar }, _count: { _all: true } }),
    // Di mode alumni, "Semua lembaga" harus mencacah alumni lintas unit —
    // bukan santri aktif — supaya tidak bentrok dengan angka per lembaga di
    // bawahnya (mis. 153 aktif vs 11 alumni Madin pada layar yang sama).
    prisma.santri.count({
      where: modeLulusan
        ? whereFilter({ ...f, unitId: undefined, kelasId: undefined, alumniUnitId: undefined, status: undefined }, { unitIds })
        : whereDasar,
    }),
    prisma.santri.count({ where: { AND: [whereDasar, { kelasLain: { none: {} } }] } }),
  ]);

  const perKelas = new Map<number, number>();
  for (const b of cacah) if (b.kelasId !== null) perKelas.set(b.kelasId, b._count._all);

  // Cacah alumni per unit dihitung lewat `whereFilter` sendiri (bukan turunan
  // `whereDasar`) karena syarat alumni bersandar pada RiwayatPendidikan, tidak
  // memaksa status Aktif — lulusan SMP yang kini aktif di MA tetap ikut terhitung.
  const alumniPerUnit = new Map<number, number>(
    await Promise.all(unitRows.map(async (u): Promise<[number, number]> => [
      u.id,
      await prisma.santri.count({ where: whereFilter({ ...f, unitId: undefined, kelasId: undefined, alumniUnitId: u.id }) }),
    ])),
  );

  const unit: SimpulUnit[] = unitRows
    .slice()
    .sort((a, b) => URUTAN_UNIT.indexOf(a.nama) - URUTAN_UNIT.indexOf(b.nama))
    .map((u) => {
      const perTingkat = new Map<string, SimpulKelas[]>();
      for (const k of kelasRows) {
        if (k.unitId !== u.id) continue;
        const list = perTingkat.get(k.tingkat) ?? [];
        list.push({ id: k.id, nama: k.nama, jumlah: perKelas.get(k.id) ?? 0 });
        perTingkat.set(k.tingkat, list);
      }
      const tingkat: SimpulTingkat[] = modeLulusan ? [] : [...perTingkat.entries()]
        .map(([nama, kelas]) => ({
          tingkat: nama,
          label: labelTingkat(u.nama, nama),
          kelas,
          jumlah: kelas.reduce((a, k) => a + k.jumlah, 0),
        }))
        .sort((a, b) => a.tingkat.localeCompare(b.tingkat, 'id', { numeric: true }));
      const alumni = alumniPerUnit.get(u.id) ?? 0;
      return {
        id: u.id,
        nama: u.nama,
        jumlah: modeLulusan ? alumni : tingkat.reduce((a, t) => a + t.jumlah, 0),
        tingkat,
        alumni,
      };
    });

  return { total, tanpaKelas, unit };
}

/** Angkatan (tahun masuk) yang benar-benar ada di data, untuk mengisi penyaring. */
export async function ambilAngkatan(): Promise<string[]> {
  const rows = await prisma.santri.findMany({
    where: { tahunMasuk: { not: null } },
    distinct: ['tahunMasuk'],
    select: { tahunMasuk: true },
    orderBy: { tahunMasuk: 'desc' },
  });
  return rows.map((r) => r.tahunMasuk!).filter(Boolean);
}
