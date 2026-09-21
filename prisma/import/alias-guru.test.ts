import { describe, expect, it } from 'vitest';
import { ALIAS_GURU_MA, KODE_BUKAN_GURU, namaResmiDariAlias } from './alias-guru';

describe('ALIAS_GURU_MA', () => {
  it('berisi 16 entri: 15 dari RENCANA-IMPORT.md + "B. Ifa" hasil verifikasi data nyata', () => {
    expect(Object.keys(ALIAS_GURU_MA)).toHaveLength(16);
  });

  it('memakai ejaan DATA GURU.xlsx untuk nama yang berbeda dari SK', () => {
    // Sumber baris Pegawai adalah DATA GURU.xlsx ("Muhammmad", tiga m),
    // bukan ejaan SK ("Muh."). Kamus harus mengikuti sumber Pegawai supaya
    // pencocokan di import-jadwal-ma.ts ketemu.
    expect(namaResmiDariAlias('P. Bismar')).toBe('Muhammmad Bismar As Sidiq');
  });
});

describe('namaResmiDariAlias', () => {
  it('mengembalikan nama resmi untuk alias yang dikenal', () => {
    expect(namaResmiDariAlias('B. Hasni')).toBe('Ilmi Nurhasni Addin');
    expect(namaResmiDariAlias('B. Ifa')).toBe('Kholifatun Khasanah');
  });

  it('melempar Error jelas untuk alias yang tidak dikenal, bukan membuat guru baru', () => {
    expect(() => namaResmiDariAlias('B. Entah')).toThrow(/tidak ada di kamus ALIAS_GURU_MA/);
  });
});

describe('KODE_BUKAN_GURU', () => {
  it('memuat kegiatan tanpa pengampu tunggal, yang pegawaiId-nya dibiarkan NULL', () => {
    expect(KODE_BUKAN_GURU.has('TKA')).toBe(true);
    expect(KODE_BUKAN_GURU.has('EKSTRA')).toBe(true);
  });

  it('tidak memuat alias guru sungguhan', () => {
    for (const alias of Object.keys(ALIAS_GURU_MA)) {
      expect(KODE_BUKAN_GURU.has(alias)).toBe(false);
    }
  });
});
