/**
 * Fungsi murni presensi (02) — diuji vitest di tests/presensi.test.ts.
 * Seluruh waktu dihitung dalam WIB (UTC+7 tetap) dari waktu SERVER, bukan jam HP.
 */
const OFFSET_WIB_MS = 7 * 60 * 60 * 1000;

/** Tanggal WIB (YYYY-MM-DD) dari sebuah instan. */
export function tanggalWib(d: Date = new Date()): string {
  return new Date(d.getTime() + OFFSET_WIB_MS).toISOString().slice(0, 10);
}

/** Nilai untuk kolom @db.Date: tengah malam UTC dari tanggal kalender itu. */
export function tanggalDb(tanggal: string): Date {
  return new Date(`${tanggal}T00:00:00.000Z`);
}

/** Menit sejak tengah malam WIB. */
export function menitWib(d: Date): number {
  const w = new Date(d.getTime() + OFFSET_WIB_MS);
  return w.getUTCHours() * 60 + w.getUTCMinutes();
}

/** Hari WIB 1=Senin .. 7=Ahad. */
export function hariWib(d: Date): number {
  const idx = new Date(d.getTime() + OFFSET_WIB_MS).getUTCDay();
  return idx === 0 ? 7 : idx;
}

/** Hari 1..7 dari string tanggal kalender. */
export function hariDariTanggal(tanggal: string): number {
  const idx = tanggalDb(tanggal).getUTCDay();
  return idx === 0 ? 7 : idx;
}

/** Bit hari untuk AttendanceSession.hariAktif (Senin=1 … Ahad=64). */
export function bitHari(hari: number): number {
  return 1 << (hari - 1);
}

export function sesiAktifPadaHari(hariAktif: number, hari: number): boolean {
  return (hariAktif & bitHari(hari)) !== 0;
}

export function menitDariJam(jam: string): number {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(jam.trim());
  if (!m) throw new Error(`Format jam tidak valid: ${jam}`);
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Jarak dua titik (meter) — rumus haversine. */
export function jarakMeter(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

export type TitikUnit = { unitId: number; lat: number; lng: number; radiusM: number };

/** Unit terdekat dari posisi pegawai + apakah di luar geofence (02 §3.3: tidak ditolak, hanya ditandai). */
export function cekGeofence(lat: number, lng: number, titik: TitikUnit[]) {
  if (titik.length === 0) return { unitId: null as number | null, jarakM: null as number | null, luar: true };
  const hasil = titik.map((t) => ({ ...t, jarak: jarakMeter(lat, lng, t.lat, t.lng) })).sort((a, b) => a.jarak - b.jarak);
  const dalam = hasil.find((h) => h.jarak <= h.radiusM);
  const pilih = dalam ?? hasil[0];
  return { unitId: pilih.unitId, jarakM: pilih.jarak, luar: !dalam };
}

/** Status check-in dari jam kerja: lewat jamMasuk + toleransi → Late (02 §3.4). */
export function statusMasuk(menitMasuk: number, jamMasuk: string, toleransiMenit: number) {
  const batas = menitDariJam(jamMasuk) + toleransiMenit;
  if (menitMasuk > batas) return { status: 'Late' as const, lateMinutes: menitMasuk - menitDariJam(jamMasuk) };
  return { status: 'Present' as const, lateMinutes: 0 };
}

export function pulangCepat(menitPulang: number, jamPulang: string): boolean {
  return menitPulang < menitDariJam(jamPulang);
}

/**
 * Presensi hari H bisa diubah pengisi sampai 23.59 WIB hari H; setelah itu
 * terkunci dan butuh presensi.lock + alasan (02 §2.4).
 */
export function terkunci(tanggal: string, sekarang: Date = new Date()): boolean {
  return tanggal < tanggalWib(sekarang);
}

export const KODE_STATUS: Record<string, 'Present' | 'Sick' | 'Excused' | 'Absent' | 'Late'> = { H: 'Present', S: 'Sick', I: 'Excused', A: 'Absent', T: 'Late' };
export const HURUF_STATUS: Record<string, string> = { Present: 'H', Sick: 'S', Excused: 'I', Absent: 'A', Late: 'T', EarlyDeparture: 'P' };
export const LABEL_STATUS: Record<string, string> = { Present: 'Hadir', Sick: 'Sakit', Excused: 'Izin', Absent: 'Alpa', Late: 'Terlambat', EarlyDeparture: 'Pulang cepat' };
