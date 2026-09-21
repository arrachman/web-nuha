import { describe, expect, it } from 'vitest';
import { keAngka, keArahKas, keTanggal } from './nilai';

describe('keAngka', () => {
  it('menerima angka polos', () => {
    expect(keAngka('350000')).toBe(350000);
    expect(keAngka('0')).toBe(0);
  });

  it('menolak format "Rp350.000"', () => {
    expect(() => keAngka('Rp350.000')).toThrow(/angka polos/);
  });

  it('menolak format "350,000"', () => {
    expect(() => keAngka('350,000')).toThrow(/angka polos/);
  });

  it('menolak string kosong', () => {
    expect(() => keAngka('')).toThrow();
  });
});

describe('keTanggal', () => {
  it('menerima format YYYY-MM-DD', () => {
    const hasil = keTanggal('2026-09-10');
    expect(hasil.toISOString().slice(0, 10)).toBe('2026-09-10');
  });

  it('menolak format lain', () => {
    expect(() => keTanggal('10-09-2026')).toThrow(/YYYY-MM-DD/);
    expect(() => keTanggal('2026/09/10')).toThrow(/YYYY-MM-DD/);
  });

  it('menolak tanggal kalender yang tidak valid', () => {
    expect(() => keTanggal('2026-02-30')).toThrow(/kalender/);
  });
});

describe('keArahKas', () => {
  it('menerima "Masuk" dan "Keluar"', () => {
    expect(keArahKas('Masuk')).toBe('Masuk');
    expect(keArahKas('Keluar')).toBe('Keluar');
  });

  it('menolak nilai lain', () => {
    expect(() => keArahKas('masuk')).toThrow();
    expect(() => keArahKas('In')).toThrow();
  });
});
