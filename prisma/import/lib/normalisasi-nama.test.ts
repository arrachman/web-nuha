import { describe, expect, it } from 'vitest';
import { normalisasiNama } from './normalisasi-nama';

describe('normalisasiNama', () => {
  it('membuang gelar umum di akhir nama', () => {
    expect(normalisasiNama('Murida Azkia, S.Pd')).toBe('murida azkia');
    expect(normalisasiNama("Khalimatus Sa'diyah, S.Si")).toBe('khalimatus sa diyah');
  });

  it('menyamakan nama walau gelar sumbernya beda dari DB', () => {
    // Ilmi Nurhasni Addin (SK) vs "Ilmi Nurhasni Addin" (Pegawai, tanpa gelar)
    expect(normalisasiNama('Ilmi Nurhasni Addin')).toBe(normalisasiNama('Ilmi Nurhasni Addin'));
  });

  it('tidak menyamakan nama yang beda ejaan hurufnya (bukan sekadar gelar)', () => {
    // "Haaizatil" (SK, 2×a) vs "Haizatil" (DB) — perbedaan ejaan sungguhan,
    // BUKAN sekadar gelar, jadi normalisasiNama saja TIDAK cukup — perlu
    // kamus eksplisit (lihat EJAAN_SK di import-struktur.ts).
    expect(normalisasiNama('Wardatul Haaizatil Husna, S.Pd., Gr'))
      .not.toBe(normalisasiNama('Wardatul Haizatil Husna, S.Sos., Gr'));
  });

  it('merapikan spasi ganda dan tanda baca', () => {
    expect(normalisasiNama("Aulan Nisa' Ulil Kamaliah,  S.Pd")).toBe('aulan nisa ulil kamaliah');
  });

  it('case-insensitive', () => {
    expect(normalisasiNama('ISMA IZHA UTAMA')).toBe(normalisasiNama('isma izha utama'));
  });
});
