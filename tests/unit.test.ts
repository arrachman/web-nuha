import { describe, expect, it } from 'vitest';
import { normalizeTarget, renderTemplate } from '@/lib/wa';
import { hitungGaji } from '@/lib/gaji';

describe('WhatsApp helpers', () => {
  it('normalizes Indonesian domestic numbers', () => {
    expect(normalizeTarget('0812-3456-789')).toBe('628123456789');
    expect(normalizeTarget('+62 812 3456 789')).toBe('628123456789');
    expect(normalizeTarget('628123456789')).toBe('628123456789');
  });

  it('rejects empty numbers', () => {
    expect(() => normalizeTarget('---')).toThrow('Nomor WhatsApp tidak valid.');
  });

  it('renders placeholders and blanks missing values', () => {
    expect(renderTemplate('Halo {{ nama }}, tagihan {{nominal}}', { nama: 'Alya', nominal: 25000 }))
      .toBe('Halo Alya, tagihan 25000');
    expect(renderTemplate('Kode {{missing}}', {})).toBe('Kode ');
  });
});

describe('Payroll calculation', () => {
  it('calculates gross, deductions, and net pay', () => {
    const result = hitungGaji({
      id: 1n,
      pegawaiId: 1n,
      pokok: 3000000,
      tunjJab: 500000,
      tunjKel: 250000,
      jamMengajar: 10,
      tarifJam: 50000,
      transport: 100000,
      bpjs: 100000,
      koperasi: 50000,
      pph: 25000,
    } as never);
    expect(result).toEqual({ bruto: 4350000, potongan: 175000, netto: 4175000 });
  });

  it('returns zero totals without components', () => {
    expect(hitungGaji(null)).toEqual({ bruto: 0, potongan: 0, netto: 0 });
  });
});
