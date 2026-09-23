import { describe, expect, it } from 'vitest';
import { bitHari, cekGeofence, hariDariTanggal, jarakMeter, menitWib, pulangCepat, sesiAktifPadaHari, statusMasuk, tanggalWib, terkunci } from '../lib/presensi/inti';

describe('waktu WIB dari waktu server', () => {
  it('tanggal & menit mengikuti WIB, bukan UTC', () => {
    const d = new Date('2026-09-22T18:30:00Z'); // 01.30 WIB tanggal 23
    expect(tanggalWib(d)).toBe('2026-09-23');
    expect(menitWib(d)).toBe(90);
  });
  it('hari 1=Senin..7=Ahad dan bitmask sesi', () => {
    expect(hariDariTanggal('2026-09-21')).toBe(1); // Senin
    expect(hariDariTanggal('2026-09-27')).toBe(7); // Ahad
    expect(sesiAktifPadaHari(63, 6)).toBe(true);
    expect(sesiAktifPadaHari(63, 7)).toBe(false);
    expect(sesiAktifPadaHari(47, 5)).toBe(false); // Madin libur Jumat
    expect(bitHari(5)).toBe(16);
  });
  it('presensi terkunci setelah lewat hari H (WIB)', () => {
    const sekarang = new Date('2026-09-23T03:00:00Z');
    expect(terkunci('2026-09-23', sekarang)).toBe(false);
    expect(terkunci('2026-09-22', sekarang)).toBe(true);
  });
});

describe('geofence', () => {
  const titik = [{ unitId: 4, lat: -7.9944, lng: 112.6395, radiusM: 150 }, { unitId: 3, lat: -7.995, lng: 112.6388, radiusM: 150 }];
  it('jarak haversine masuk akal', () => {
    expect(jarakMeter(-7.9944, 112.6395, -7.9944, 112.6395)).toBe(0);
    const satuKm = jarakMeter(-7.9944, 112.6395, -7.9854, 112.6395);
    expect(satuKm).toBeGreaterThan(990);
    expect(satuKm).toBeLessThan(1010);
  });
  it('dalam radius memilih unit yang memuatnya', () => {
    const g = cekGeofence(-7.99441, 112.63951, titik);
    expect(g.luar).toBe(false);
    expect(g.unitId).toBe(4);
  });
  it('di luar radius tetap tercatat dengan unit terdekat & jaraknya', () => {
    const g = cekGeofence(-7.9800, 112.6395, titik);
    expect(g.luar).toBe(true);
    expect(g.unitId).toBe(4);
    expect(g.jarakM).toBeGreaterThan(1000);
  });
  it('tanpa titik unit dianggap luar lokasi', () => {
    expect(cekGeofence(0, 0, []).luar).toBe(true);
  });
});

describe('status jam kerja', () => {
  it('terlambat bila lewat jam masuk + toleransi', () => {
    expect(statusMasuk(7 * 60 + 15, '07:00', 15)).toEqual({ status: 'Present', lateMinutes: 0 });
    expect(statusMasuk(7 * 60 + 16, '07:00', 15)).toEqual({ status: 'Late', lateMinutes: 16 });
  });
  it('pulang cepat bila sebelum jam pulang', () => {
    expect(pulangCepat(13 * 60 + 59, '14:00')).toBe(true);
    expect(pulangCepat(14 * 60, '14:00')).toBe(false);
  });
});
