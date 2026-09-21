import { describe, expect, it } from 'vitest';
import { parseTtl } from './tanggal-id';

describe('parseTtl', () => {
  it('mem-parse format judul-kasus normal', () => {
    const { tempat, tanggal } = parseTtl('Malang, 12 Oktober 1995');
    expect(tempat).toBe('Malang');
    expect(tanggal.getUTCFullYear()).toBe(1995);
    expect(tanggal.getUTCMonth()).toBe(9); // Oktober = index 9
    expect(tanggal.getUTCDate()).toBe(12);
  });

  it('menormalkan tempat dari huruf besar semua', () => {
    const { tempat } = parseTtl('MALANG, 12 AGUSTUS 2009');
    expect(tempat).toBe('Malang');
  });

  it('menangani nama kota dua kata', () => {
    const { tempat } = parseTtl('Pematang Manggis, 10 Mei 1998');
    expect(tempat).toBe('Pematang Manggis');
  });

  it('melempar Error bila tidak ada koma', () => {
    expect(() => parseTtl('Malang 12 Oktober 1995')).toThrow(/Tempat, DD Bulan YYYY/);
  });

  it('melempar Error bila nama bulan tidak dikenal', () => {
    expect(() => parseTtl('Malang, 12 Octobber 1995')).toThrow(/bulan/);
  });

  it('melempar Error untuk tanggal kalender tidak valid', () => {
    expect(() => parseTtl('Malang, 30 Februari 2000')).toThrow(/kalender/);
  });
});
