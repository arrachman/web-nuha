import type { Prisma } from '@prisma/client';

/** Urutan daftar pegawai. Kunci ikut ke URL, jadi dieja eksplisit. */
export const URUT_PEGAWAI = {
  nama: { label: 'Nama A–Z', orderBy: { person: { fullName: 'asc' } } },
  'nama-desc': { label: 'Nama Z–A', orderBy: { person: { fullName: 'desc' } } },
  nip: { label: 'NIP terkecil', orderBy: { employeeNumber: 'asc' } },
  'jam-desc': { label: 'Jam mengajar terbanyak', orderBy: { teachingHours: 'desc' } },
} as const satisfies Record<string, { label: string; orderBy: Prisma.StaffOrderByWithRelationInput }>;
export type UrutPegawai = keyof typeof URUT_PEGAWAI;
const URUT_BAWAAN: UrutPegawai = 'nama';

/** Kunci semu untuk pegawai yang belum punya unit — dipakai di URL & chip. */
export const TANPA_LEMBAGA = 'tanpa';

export type FilterPegawai = {
  q: string;
  /** Key unit ("SMP", "MA", …) atau TANPA_LEMBAGA. */
  unit?: string;
  status?: string;
  jk?: 'L' | 'P';
  urut: UrutPegawai;
};

const ambilSatu = (sp: Record<string, string | string[] | undefined>, k: string) => {
  const v = sp[k];
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim() : undefined;
};

export function bacaFilterPegawai(sp: Record<string, string | string[] | undefined>): FilterPegawai {
  const jk = ambilSatu(sp, 'jk');
  const urut = ambilSatu(sp, 'urut');
  return {
    q: ambilSatu(sp, 'q') ?? '',
    unit: ambilSatu(sp, 'unit'),
    status: ambilSatu(sp, 'status'),
    jk: jk === 'L' || jk === 'P' ? jk : undefined,
    urut: urut && urut in URUT_PEGAWAI ? (urut as UrutPegawai) : URUT_BAWAAN,
  };
}

/** Syarat unit dipakai ulang oleh tab lain lewat relasi `pegawai`, jadi dipisah.
 *
 * Seorang pegawai bisa bertugas di lebih dari satu lembaga — mis. Alfan Jamil
 * mengajar Fikih di MA sekaligus jadi asatidz Madin — dan harus muncul pada
 * kedua penyaring. Penugasan tambahan hidup di `unitLain` (`pegawai_unit`),
 * sedangkan `unitId` adalah unit utama. Keduanya dicocokkan dengan OR supaya
 * pegawai yang belum punya baris `pegawai_unit` (dibuat lewat menu CRUD atau
 * seed) tetap terhitung — tabel jung tidak wajib terisi. */
export function whereUnit(unit?: string): Prisma.StaffWhereInput | undefined {
  if (!unit) return undefined;
  return unit === TANPA_LEMBAGA
    ? { AND: [{ unitId: null }, { otherUnits: { none: {} } }] }
    : { OR: [{ unit: { key: unit } }, { otherUnits: { some: { unit: { key: unit } } } }] };
}

/** WHERE Prisma untuk daftar pegawai. Disusun sebagai daftar AND supaya
 * pencarian bebas (OR nama/NIP/jabatan) tidak bentrok dengan penyaring lain. */
export function wherePegawai(f: FilterPegawai): Prisma.StaffWhereInput {
  const syarat: Prisma.StaffWhereInput[] = [];
  const unit = whereUnit(f.unit);
  if (unit) syarat.push(unit);
  if (f.status) syarat.push({ status: f.status });
  if (f.jk) syarat.push({ person: { gender: f.jk } });
  if (f.q) {
    syarat.push({
      OR: [
        { person: { fullName: { contains: f.q } } },
        { employeeNumber: { contains: f.q } },
        { position: { contains: f.q } },
        { subjectsTaught: { contains: f.q } },
      ],
    });
  }
  return syarat.length ? { AND: syarat } : {};
}

/** Query-string kanonis: hanya kunci berisi, urutan tetap supaya URL stabil
 * dan bisa dibookmark. */
export function queryPegawai(f: Partial<FilterPegawai>): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.unit) p.set('unit', f.unit);
  if (f.status) p.set('status', f.status);
  if (f.jk) p.set('jk', f.jk);
  if (f.urut && f.urut !== URUT_BAWAAN) p.set('urut', f.urut);
  return p;
}

/** Tautan ke /kepegawaian dengan filter sekarang + perubahan. Mengganti filter
 * selalu mereset halaman karena baris lama bisa tersaring keluar.
 * `undefined` pada `ubah` berarti "hapus kunci itu". */
export function hrefKepegawaian(
  tab: string,
  f: FilterPegawai,
  ubah: Partial<FilterPegawai> = {},
  extra: { halaman?: number } = {},
): string {
  const p = queryPegawai({ ...f, ...ubah } as FilterPegawai);
  if (tab) p.set('tab', tab);
  if (extra.halaman && extra.halaman > 1) p.set('halaman', String(extra.halaman));
  const s = p.toString();
  return s ? `/kepegawaian?${s}` : '/kepegawaian';
}

export function jumlahFilterPegawai(f: FilterPegawai): number {
  return [f.q, f.unit, f.status, f.jk].filter(Boolean).length;
}

/** Semua filter dilepas, urutan dipertahankan (urutan bukan penyaring). */
export const filterPegawaiKosong = (f: FilterPegawai): FilterPegawai => ({ q: '', urut: f.urut });
