import { afterEach, describe, expect, it } from 'vitest';
import { alihkanNomorDebug, normalizeTarget } from '@/lib/wa';

const asli = process.env.WA_DEBUG_REDIRECT;
afterEach(() => {
  if (asli === undefined) delete process.env.WA_DEBUG_REDIRECT;
  else process.env.WA_DEBUG_REDIRECT = asli;
});

describe('alihkanNomorDebug', () => {
  it('meneruskan nomor apa adanya bila WA_DEBUG_REDIRECT kosong (perilaku produksi)', () => {
    delete process.env.WA_DEBUG_REDIRECT;
    expect(alihkanNomorDebug('628123456789')).toEqual({ nomorKirim: '628123456789' });
  });

  it('meneruskan apa adanya bila variabelnya hanya berisi spasi', () => {
    // Env yang disetel kosong (`WA_DEBUG_REDIRECT=`) tidak boleh terbaca sebagai
    // "alihkan ke nomor kosong" — itu akan menggagalkan seluruh pengiriman.
    process.env.WA_DEBUG_REDIRECT = '   ';
    expect(alihkanNomorDebug('628123456789')).toEqual({ nomorKirim: '628123456789' });
  });

  it('mengalihkan ke nomor debug dan mengingat tujuan aslinya', () => {
    process.env.WA_DEBUG_REDIRECT = '085607550989';
    expect(alihkanNomorDebug('628123456789')).toEqual({
      nomorKirim: '6285607550989',
      dialihkanDari: '628123456789',
    });
  });

  it('menormalkan nomor debug berformat lokal maupun 62', () => {
    process.env.WA_DEBUG_REDIRECT = '6285607550989';
    expect(alihkanNomorDebug('628123456789').nomorKirim).toBe('6285607550989');
  });

  it('tidak menandai pengalihan bila tujuannya memang nomor debug itu sendiri', () => {
    // Tanpa penjagaan ini, log akan berbunyi "dialihkan dari X ke X".
    process.env.WA_DEBUG_REDIRECT = '085607550989';
    expect(alihkanNomorDebug('6285607550989')).toEqual({ nomorKirim: '6285607550989' });
  });
});

describe('normalizeTarget', () => {
  it('mengubah awalan 0 menjadi 62 dan membuang pemisah', () => {
    expect(normalizeTarget('0856-0755-0989')).toBe('6285607550989');
  });

  it('menolak masukan tanpa satu pun angka', () => {
    expect(() => normalizeTarget('-')).toThrow(/tidak valid/);
  });
});
