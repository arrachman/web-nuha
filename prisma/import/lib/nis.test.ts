import { describe, expect, it } from 'vitest';
import { buatNis } from './nis';

describe('buatNis', () => {
  it('menyusun NIS dari tahunMasuk + kodeUnit + urut 3 digit', () => {
    expect(buatNis('2025', 'MA', 1)).toBe('2025MA001');
    expect(buatNis('2026', 'MA', 8)).toBe('2026MA008');
    expect(buatNis('2025', 'SMP', 38)).toBe('2025SMP038');
  });

  it('konsisten (deterministik) untuk input yang sama', () => {
    expect(buatNis('2025', 'MA', 12)).toBe(buatNis('2025', 'MA', 12));
  });

  it('menolak tahunMasuk yang bukan 4 digit', () => {
    expect(() => buatNis('25', 'MA', 1)).toThrow(/4 digit/);
  });

  it('menolak urut kurang dari 1', () => {
    expect(() => buatNis('2025', 'MA', 0)).toThrow(/urutDalamAngkatan/);
  });
});
