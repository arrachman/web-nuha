import type { Prisma } from '@prisma/client';

/** Status santri yang boleh dipilih di penyaring. Sengaja dieja di sini (bukan
 * impor enum) supaya nilai tak dikenal dari URL tidak lolos ke Prisma. */
export const STATUS_SANTRI = ['Aktif', 'TidakAktif'] as const;
export type StatusPilihan = (typeof STATUS_SANTRI)[number];

/** Urutan daftar santri. Kunci ikut ke URL, jadi dieja eksplisit. */
export const URUT = {
  nama: { label: 'Nama A–Z', orderBy: { person: { fullName: 'asc' } } },
  'nama-desc': { label: 'Nama Z–A', orderBy: { person: { fullName: 'desc' } } },
  nis: { label: 'NIS terkecil', orderBy: { nis: 'asc' } },
  baru: { label: 'Terbaru ditambahkan', orderBy: { createdAt: 'desc' } },
} as const satisfies Record<string, { label: string; orderBy: Prisma.SantriOrderByWithRelationInput }>;
export type UrutPilihan = keyof typeof URUT;
const URUT_BAWAAN: UrutPilihan = 'nama';

export type FilterAkademik = {
  q: string;
  unit?: string;
  tingkat?: string;
  kelasId?: number;
  status?: StatusPilihan;
  jk?: 'L' | 'P';
  program?: string;
  angkatan?: string;
  asramaId?: number;
  urut: UrutPilihan;
};

const ambilSatu = (sp: Record<string, string | string[] | undefined>, k: string) => {
  const v = sp[k];
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim() : undefined;
};

const angkaPositif = (s?: string) => {
  const n = Number(s);
  return s && Number.isInteger(n) && n > 0 ? n : undefined;
};

export function bacaFilter(sp: Record<string, string | string[] | undefined>): FilterAkademik {
  const status = ambilSatu(sp, 'status');
  const jk = ambilSatu(sp, 'jk');
  const urut = ambilSatu(sp, 'urut');
  return {
    q: ambilSatu(sp, 'q') ?? '',
    unit: ambilSatu(sp, 'unit'),
    tingkat: ambilSatu(sp, 'tingkat'),
    kelasId: angkaPositif(ambilSatu(sp, 'kelas')),
    status: STATUS_SANTRI.includes(status as StatusPilihan) ? (status as StatusPilihan) : undefined,
    jk: jk === 'L' || jk === 'P' ? jk : undefined,
    program: ambilSatu(sp, 'program'),
    angkatan: ambilSatu(sp, 'angkatan'),
    asramaId: angkaPositif(ambilSatu(sp, 'asrama')),
    urut: urut && urut in URUT ? (urut as UrutPilihan) : URUT_BAWAAN,
  };
}

/** WHERE Prisma dari filter. Disusun sebagai daftar AND supaya pencarian bebas
 * (OR nama/NIS/NISN) tidak bentrok dengan penyaring di relasi yang sama.
 * Kelas menang atas tingkat, tingkat menang atas unit — yang lebih sempit
 * sudah menyiratkan induknya. */
export function whereFilter(f: FilterAkademik): Prisma.SantriWhereInput {
  const syarat: Prisma.SantriWhereInput[] = [];
  if (f.kelasId) syarat.push({ kelasId: f.kelasId });
  else if (f.tingkat) syarat.push({ kelas: { tingkat: f.tingkat, ...(f.unit ? { unit: { key: f.unit } } : {}) } });
  else if (f.unit) syarat.push({ unit: { key: f.unit } });
  if (f.status) syarat.push({ status: f.status });
  if (f.jk) syarat.push({ person: { gender: f.jk } });
  if (f.program) syarat.push({ program: f.program });
  if (f.angkatan) syarat.push({ tahunMasuk: f.angkatan });
  if (f.asramaId) syarat.push({ room: { dormitoryId: f.asramaId } });
  if (f.q) {
    syarat.push({
      OR: [
        { person: { fullName: { contains: f.q } } },
        { nis: { contains: f.q } },
        { nisn: { contains: f.q } },
      ],
    });
  }
  return syarat.length ? { AND: syarat } : {};
}

/** Query-string kanonis: hanya kunci berisi, urutan tetap supaya URL stabil
 * dan bisa dibookmark. */
export function queryFilter(f: Partial<FilterAkademik>): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.unit) p.set('unit', f.unit);
  if (f.tingkat) p.set('tingkat', f.tingkat);
  if (f.kelasId) p.set('kelas', String(f.kelasId));
  if (f.status) p.set('status', f.status);
  if (f.jk) p.set('jk', f.jk);
  if (f.program) p.set('program', f.program);
  if (f.angkatan) p.set('angkatan', f.angkatan);
  if (f.asramaId) p.set('asrama', String(f.asramaId));
  if (f.urut && f.urut !== URUT_BAWAAN) p.set('urut', f.urut);
  return p;
}

/** Tautan ke /akademik dengan filter sekarang + perubahan. Mengganti filter
 * selalu mereset halaman karena baris lama bisa tersaring keluar.
 * `undefined` pada `ubah` berarti "hapus kunci itu". */
export function hrefAkademik(
  tab: string,
  f: FilterAkademik,
  ubah: Partial<FilterAkademik> = {},
  extra: { halaman?: number } = {},
): string {
  const gabung = { ...f, ...ubah } as FilterAkademik;
  const p = queryFilter(gabung);
  if (tab) p.set('tab', tab);
  if (extra.halaman && extra.halaman > 1) p.set('halaman', String(extra.halaman));
  const s = p.toString();
  return s ? `/akademik?${s}` : '/akademik';
}

export function jumlahFilterAktif(f: FilterAkademik): number {
  return [f.q, f.unit, f.tingkat, f.kelasId, f.status, f.jk, f.program, f.angkatan, f.asramaId]
    .filter(Boolean).length;
}

/** Kunci filter yang bisa dicopot satu per satu lewat chip. */
export type KunciFilter = 'q' | 'unit' | 'tingkat' | 'kelasId' | 'status' | 'jk' | 'program' | 'angkatan' | 'asramaId';

/** Nilai kosong untuk `hrefAkademik(..., { [kunci]: KOSONG[kunci] })` — mencopot satu filter. */
export const KOSONG: Record<KunciFilter, undefined | ''> = {
  q: '', unit: undefined, tingkat: undefined, kelasId: undefined, status: undefined,
  jk: undefined, program: undefined, angkatan: undefined, asramaId: undefined,
};

/** Semua filter dilepas, urutan dipertahankan (urutan bukan penyaring). */
export const filterKosong = (f: FilterAkademik): FilterAkademik => ({ q: '', urut: f.urut });
