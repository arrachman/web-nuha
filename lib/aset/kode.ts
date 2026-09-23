import { randomBytes } from 'node:crypto';

/**
 * Kode inventaris `NH/{UNIT}/{KATEGORI}/{TAHUN}/{URUT4}` (04 §4), contoh
 * `NH/MA/B.02.03/2026/0017`. Kode kategori sudah memuat golongan KIB di depan.
 * Urut per unit + kategori + tahun.
 */
export function prefiksKodeInventaris(unitKey: string, kodeKategori: string, tahun: number): string {
  return `NH/${unitKey.toUpperCase()}/${kodeKategori}/${tahun}/`;
}

/** Kode berikutnya dari kode terakhir berprefiks sama (null = belum ada). */
export function kodeBerikutnya(prefiks: string, kodeTerakhir: string | null, lompat = 0): string {
  const terakhir = kodeTerakhir && kodeTerakhir.startsWith(prefiks) ? Number(kodeTerakhir.slice(prefiks.length)) || 0 : 0;
  return `${prefiks}${String(terakhir + 1 + lompat).padStart(4, '0')}`;
}

/** Token QR acak (bukan id berurutan) supaya URL /a/<token> tidak bisa ditebak. */
export function buatQrToken(): string {
  return randomBytes(12).toString('base64url');
}

/**
 * Nomor dokumen berurut per tahun: KRS-2026-0001, PGD-2026-0001, dst.
 * Pemanggil membungkus dengan retry-on-P2002 (lihat denganRetryUnik).
 */
export function nomorDokumen(prefiks: string, tahun: number, kodeTerakhir: string | null, lompat = 0): string {
  return kodeBerikutnya(`${prefiks}-${tahun}-`, kodeTerakhir, lompat);
}

export function konflikUnik(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002';
}

/**
 * Jalankan `buat(percobaan)` dan ulangi bila bentrok unik (dua pengguna
 * membangkitkan nomor yang sama bersamaan). `percobaan` dipakai sebagai
 * lompatan urut supaya percobaan ulang tidak menebak nomor yang sama lagi.
 */
export async function denganRetryUnik<T>(buat: (percobaan: number) => Promise<T>, maks = 6): Promise<T> {
  for (let percobaan = 0; ; percobaan++) {
    try {
      return await buat(percobaan);
    } catch (err) {
      if (!konflikUnik(err) || percobaan >= maks - 1) throw err;
    }
  }
}
