import type { Prisma } from '@prisma/client';

/** Status santri yang boleh dipilih di penyaring. Tanpa pilihan eksplisit,
 * /induk menampilkan santri aktif saja. Cabang "Lulusan" per unit di
 * pohon lembaga (`alumniUnitId`) memakai riwayat pendidikan, bukan kolom
 * status, jadi keduanya saling meniadakan — lihat `whereFilter`. */
export const STATUS_SANTRI = ['Aktif', 'TidakAktif'] as const;
export type StatusPilihan = (typeof STATUS_SANTRI)[number];
const STATUS_AKTIF: StatusPilihan = 'Aktif';

export type FilterInduk = {
  q: string;
  unitId?: number;
  kelasId?: number | 'none';
  jk?: 'L' | 'P';
  angkatan?: string;
  status?: StatusPilihan;
  alumniUnitId?: number;
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

export function bacaFilter(sp: Record<string, string | string[] | undefined>): FilterInduk {
  const jk = ambilSatu(sp, 'jk');
  const status = ambilSatu(sp, 'status');
  return {
    status: STATUS_SANTRI.includes(status as StatusPilihan) ? (status as StatusPilihan) : undefined,
    q: ambilSatu(sp, 'q') ?? '',
    unitId: angkaPositif(ambilSatu(sp, 'unit')),
    kelasId: ambilSatu(sp, 'kelas') === 'none' ? 'none' : angkaPositif(ambilSatu(sp, 'kelas')),
    jk: jk === 'L' || jk === 'P' ? jk : undefined,
    angkatan: ambilSatu(sp, 'angkatan'),
    alumniUnitId: angkaPositif(ambilSatu(sp, 'alumni')),
  };
}

/** Lulusan sebuah lembaga = punya riwayat berstatus `Lulus` di unit itu DAN
 * tidak lagi terdaftar di rombel unit yang sama. Syarat kedua wajib: importir
 * riwayat menulis satu baris per tahun ajaran, sehingga santri yang masih aktif
 * (mis. Madin Tingkat VI 2026/2027) tetap memiliki baris `Lulus` untuk tahun-
 * tahun lampaunya. Tanpa penyaring `SantriKelas`, 11 santri Madin yang masih
 * mengaji — termasuk yang naik dari Kelas 2 ke Kelas 6 — salah dicap alumni.
 * Kepindahan antar-lembaga tetap terbaca alumni (lulus SMP → aktif di MA:
 * rombel SMP-nya sudah tidak ada), jadi perilaku lama untuk SMP tidak berubah. */
const lulusanDiUnit = (unitId: number): Prisma.SantriWhereInput => ({
  person: { riwayatPendidikan: { some: { status: 'Lulus', unitId } } },
  kelasLain: { none: { unitId } },
});

/** WHERE Prisma dari filter, disusun sebagai daftar AND supaya pencarian bebas
 * (OR nama/NIS/NISN) tidak bentrok dengan penyaring jenis kelamin di relasi yang sama.
 * Kelas menang atas unit karena kelas sudah menyiratkan unitnya. */
export function whereFilter(f: FilterInduk, opsi: { unitIds?: number[] } = {}): Prisma.SantriWhereInput {
  const syarat: Prisma.SantriWhereInput[] = [];
  // "Lulusan" selalu dijawab dari `RiwayatPendidikan`, bukan kolom `santri.status`.
  // Alasannya: santri yang lulus SMP lalu aktif di MA tetap tercatat sebagai lulusan SMP,
  // padahal status globalnya tetap `Aktif`. Memakai kolom status akan menghilangkan
  // mereka (17 dari 24 lulusan SMP) dan membuat cabang Lulusan tidak cocok dengan
  // cabang "Lulusan" per unit di pohon lembaga. Karena itu syarat unit/kelas/
  // status aktif diabaikan di cabang ini — unit disaring lewat riwayatnya.
  const unitLulusan = f.alumniUnitId;
  if (unitLulusan) {
    syarat.push(lulusanDiUnit(unitLulusan));
  } else {
    // Keanggotaan unit/kelas: punya penempatan rombel (`SantriKelas`) di unit/kelas
    // itu ATAU unit/kelas utamanya (`santri.unitId/kelasId`) unit/kelas itu — satu
    // santri bisa sekolah di SMP sekaligus mengaji di Madin, dan penempatan rombel
    // bisa kosong (belum diimpor), sehingga kolom utama tidak boleh diabaikan.
    // "Tanpa kelas" berarti tidak punya penempatan dan tidak punya kelas utama.
    if (f.kelasId === 'none') syarat.push({ kelasLain: { none: {} }, kelasId: null });
    else if (f.kelasId) syarat.push({ OR: [{ kelasLain: { some: { kelasId: f.kelasId } } }, { kelasId: f.kelasId }] });
    else if (f.unitId) syarat.push({ OR: [{ kelasLain: { some: { unitId: f.unitId } } }, { unitId: f.unitId }] });
    syarat.push({ status: f.status ?? STATUS_AKTIF });
  }
  if (f.angkatan) syarat.push({ tahunMasuk: f.angkatan });
  if (f.jk) syarat.push({ person: { gender: f.jk } });
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

/** Query-string kanonis: hanya kunci berisi, urutan tetap supaya URL stabil & bisa dibookmark. */
export function queryFilter(f: Partial<FilterInduk>): string {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.unitId) p.set('unit', String(f.unitId));
  if (f.kelasId) p.set('kelas', String(f.kelasId));
  if (f.alumniUnitId) p.set('alumni', String(f.alumniUnitId));
  if (f.status) p.set('status', f.status);
  if (f.jk) p.set('jk', f.jk);
  if (f.angkatan) p.set('angkatan', f.angkatan);
  return p.toString();
}

/** Tautan ke /induk dengan filter sekarang + perubahan. `sel`/`tab` opsional
 * karena mengganti filter harus mereset seleksi (santri lama bisa tersaring keluar).
 * `halaman` juga tidak ikut terbawa: penyaring baru selalu mulai dari halaman 1. */
export function hrefInduk(
  f: FilterInduk,
  ubah: Partial<FilterInduk> = {},
  extra: { sel?: bigint | string; tab?: string; halaman?: number } = {},
): string {
  // Simpul Lulusan dan simpul unit/kelas saling meniadakan: keduanya menjawab
  // "santri mana", jadi memilih salah satu harus membersihkan yang lain.
  // Status TidakAktif membuang kelas dan unit karena santri tersebut tidak lagi
  // terikat rombel aktif. Lulusan per lembaga tetap disaring secara terpisah
  // melalui `RiwayatPendidikan`.
  const bersih: Partial<FilterInduk> = 'alumniUnitId' in ubah
    ? { unitId: undefined, kelasId: undefined }
    : 'status' in ubah
      ? {
          alumniUnitId: undefined,
          ...(ubah.status && ubah.status !== STATUS_AKTIF ? { kelasId: undefined } : {}),
          ...(ubah.status === 'TidakAktif' ? { unitId: undefined } : {}),
        }
      : ('unitId' in ubah || 'kelasId' in ubah) ? { alumniUnitId: undefined } : {};
  const gabung = { ...f, ...bersih, ...ubah };
  const p = new URLSearchParams(queryFilter(gabung));
  if (extra.sel !== undefined) p.set('sel', String(extra.sel));
  if (extra.tab) p.set('tab', extra.tab);
  if (extra.halaman && extra.halaman > 1) p.set('halaman', String(extra.halaman));
  const s = p.toString();
  return s ? `/induk?${s}` : '/induk';
}

export function jumlahFilterAktif(f: FilterInduk): number {
  return [f.q, f.unitId, f.kelasId, f.alumniUnitId, f.status, f.jk, f.angkatan].filter(Boolean).length;
}
