import { prisma } from '@/lib/prisma';
import { whereFilter, type FilterAkademik } from './filter';

export type SimpulKelas = { id: number; nama: string; tahun: string | null; jumlah: number };
export type SimpulTingkat = { tingkat: string; jumlah: number; kelas: SimpulKelas[] };
export type SimpulUnit = { key: string; nama: string; jumlah: number; tingkat: SimpulTingkat[] };

export type PohonAkademik = {
  total: number;
  unit: SimpulUnit[];
  /** Tingkat pada unit yang sedang dipilih (kosong bila belum memilih unit). */
  tingkatAktif: SimpulTingkat[];
  /** Kelas pada tingkat yang sedang dipilih (kosong bila belum memilih tingkat). */
  kelasAktif: SimpulKelas[];
};

const TANPA_KELAS = 'Tanpa kelas';

/**
 * Data warisan punya rombel bernama sama di tahun ajaran berbeda (mis. dua "7A",
 * satu tanpa tahun ajaran). Dua chip identik tak bisa dibedakan operator, jadi
 * nama yang bentrok diberi keterangan tahun ajarannya.
 */
function bedakanNama<T extends { nama: string; tahun: string | null }>(rows: T[]): T[] {
  const hitung = new Map<string, number>();
  for (const r of rows) hitung.set(r.nama, (hitung.get(r.nama) ?? 0) + 1);
  return rows.map((r) =>
    (hitung.get(r.nama) ?? 0) > 1
      ? { ...r, nama: `${r.nama} (${r.tahun ?? 'tanpa TA'})` }
      : r,
  );
}

/** Urutkan tingkat secara alami: angka dulu (7, 8, 9, 10…), lalu teks (Wustha, Ulya). */
function bandingTingkat(a: string, b: string) {
  const na = Number(a.replace(/\D/g, ''));
  const nb = Number(b.replace(/\D/g, ''));
  if (Number.isFinite(na) && na && Number.isFinite(nb) && nb) return na - nb;
  if (na && !nb) return -1;
  if (!na && nb) return 1;
  return a.localeCompare(b, 'id');
}

/**
 * Hitung pohon Pesantren → unit → tingkat → kelas beserta jumlah santri.
 *
 * Jumlah dihitung dengan filter lain tetap berlaku (pencarian, status, jenis
 * kelamin) tapi tanpa filter unit/tingkat/kelas itu sendiri — supaya angka di
 * chip menunjukkan "kalau saya klik ini, dapat berapa", bukan nol semua.
 */
export async function bacaPohon(f: FilterAkademik): Promise<PohonAkademik> {
  const dasar = whereFilter({ ...f, unit: undefined, tingkat: undefined, kelasId: undefined });

  const [baris, unitRows, kelasRows] = await Promise.all([
    prisma.santri.groupBy({ by: ['unitId', 'kelasId'], where: dasar, _count: { _all: true } }),
    prisma.unit.findMany({ orderBy: { id: 'asc' } }),
    prisma.kelas.findMany({ include: { unit: true, academicYear: true }, orderBy: { nama: 'asc' } }),
  ]);

  const kelasById = new Map(kelasRows.map((k) => [k.id, k]));
  const unitById = new Map(unitRows.map((u) => [u.id, u]));

  // unitKey -> tingkat -> { kelasId|null -> jumlah }
  const peta = new Map<string, Map<string, Map<number | null, number>>>();
  let total = 0;

  for (const b of baris) {
    const jumlah = b._count._all;
    total += jumlah;
    const kelas = b.kelasId ? kelasById.get(b.kelasId) : undefined;
    const unit = kelas?.unit ?? (b.unitId ? unitById.get(b.unitId) : undefined);
    const unitKey = unit?.key ?? '-';
    const tingkat = kelas?.tingkat || TANPA_KELAS;

    const perTingkat = peta.get(unitKey) ?? new Map();
    const perKelas = perTingkat.get(tingkat) ?? new Map();
    perKelas.set(kelas?.id ?? null, (perKelas.get(kelas?.id ?? null) ?? 0) + jumlah);
    perTingkat.set(tingkat, perKelas);
    peta.set(unitKey, perTingkat);
  }

  const unit: SimpulUnit[] = unitRows
    .filter((u) => peta.has(u.key))
    .map((u) => {
      const perTingkat = peta.get(u.key)!;
      const tingkat: SimpulTingkat[] = [...perTingkat.entries()]
        .map(([namaTingkat, perKelas]) => ({
          tingkat: namaTingkat,
          jumlah: [...perKelas.values()].reduce((s, n) => s + n, 0),
          kelas: bedakanNama(
            [...perKelas.entries()]
              .filter(([id]) => id !== null)
              .map(([id, jumlah]) => {
                const k = kelasById.get(id as number);
                return { id: id as number, nama: k?.nama ?? '-', tahun: k?.academicYear?.code ?? null, jumlah };
              })
              .sort((a, b) => a.nama.localeCompare(b.nama, 'id')),
          ),
        }))
        .sort((a, b) => bandingTingkat(a.tingkat, b.tingkat));
      return {
        key: u.key,
        nama: u.nama,
        jumlah: tingkat.reduce((s, t) => s + t.jumlah, 0),
        tingkat,
      };
    })
    .sort((a, b) => b.jumlah - a.jumlah);

  const unitAktif = f.unit ? unit.find((u) => u.key === f.unit) : undefined;
  const tingkatAktif = unitAktif?.tingkat ?? [];
  const kelasAktif = f.tingkat ? (tingkatAktif.find((t) => t.tingkat === f.tingkat)?.kelas ?? []) : [];

  return { total, unit, tingkatAktif, kelasAktif };
}
