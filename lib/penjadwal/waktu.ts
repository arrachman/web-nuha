/**
 * Waktu wall-clock WIB (Asia/Jakarta, UTC+7 tetap — tidak ada DST di
 * Indonesia). Container jalan di UTC secara default, jadi seluruh penjadwal
 * WAJIB lewat helper ini, bukan `new Date()` langsung.
 *
 * `NUHA_CRON_NOW` (opsional, format ISO 8601) mengganti "sekarang" — HANYA
 * untuk pengujian manual penjadwal secara deterministik (mis. memaksa
 * penjadwal berpikir sekarang pukul 19.00 supaya reminder H-1 bisa diuji
 * kapan saja). Jangan pernah diset di lingkungan produksi/compose.
 */
const OFFSET_WIB_MENIT = 7 * 60;

export type WaktuWib = {
  /** Tanggal WIB, format YYYY-MM-DD. */
  tanggal: string;
  /** 0=Minggu .. 6=Sabtu, mengikuti hari WIB (bukan hari UTC). */
  hariIndex: number;
  jam: number;
  menit: number;
};

function bacaSekarang(): Date {
  const override = process.env.NUHA_CRON_NOW?.trim();
  if (override) {
    const parsed = new Date(override);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

export function sekarangWib(): WaktuWib {
  const utc = bacaSekarang();
  const wib = new Date(utc.getTime() + OFFSET_WIB_MENIT * 60_000);
  return {
    tanggal: wib.toISOString().slice(0, 10),
    hariIndex: wib.getUTCDay(),
    jam: wib.getUTCHours(),
    menit: wib.getUTCMinutes(),
  };
}

/** Tanggal WIB besok (H+1 dari `sekarangWib()`), format YYYY-MM-DD. */
export function besokWib(): WaktuWib {
  const utc = bacaSekarang();
  const wib = new Date(utc.getTime() + OFFSET_WIB_MENIT * 60_000 + 24 * 60 * 60_000);
  return {
    tanggal: wib.toISOString().slice(0, 10),
    hariIndex: wib.getUTCDay(),
    jam: wib.getUTCHours(),
    menit: wib.getUTCMinutes(),
  };
}

// Konvensi penamaan hari BERBEDA antar tabel sumber (lihat CLAUDE.md
// web-nuha §7 & RENCANA-IMPORT.md §Fase 7.2) — `jadwal_piket` memakai
// apostrof lengkung "Jum'at", `jadwal_pelajaran` memakai "Jumat" polos.
// Dicocokkan string persis, BUKAN via Intl/locale Date.
const NAMA_HARI_PIKET = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'] as const;
const NAMA_HARI_PELAJARAN = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;

export function namaHariPiket(hariIndex: number): string {
  return NAMA_HARI_PIKET[hariIndex];
}

export function namaHariPelajaran(hariIndex: number): string {
  return NAMA_HARI_PELAJARAN[hariIndex];
}

/** Parse "HH.MM" atau "HH:MM" menjadi menit-sejak-tengah-malam. Mengembalikan null bila formatnya tidak valid. */
export function menitDariJam(jamStr: string): number | null {
  const cocok = /^(\d{1,2})[.:](\d{2})/.exec(jamStr.trim());
  if (!cocok) return null;
  const jam = Number(cocok[1]);
  const menit = Number(cocok[2]);
  if (jam < 0 || jam > 23 || menit < 0 || menit > 59) return null;
  return jam * 60 + menit;
}
