import type { SalaryComponent } from '@prisma/client';

export type HitungGaji = { bruto: number; potongan: number; netto: number };

/**
 * Payroll is derived from the stored components rather than kept as a copied
 * total, so an edit to any component cannot drift from the slip.
 */
export function hitungGaji(komponen: SalaryComponent | null): HitungGaji {
  if (!komponen) return { bruto: 0, potongan: 0, netto: 0 };
  const bruto = Number(komponen.baseSalary)
    + Number(komponen.positionAllowance)
    + Number(komponen.familyAllowance)
    + komponen.teachingHours * Number(komponen.hourlyRate)
    + Number(komponen.transport);
  const potongan = Number(komponen.bpjs) + Number(komponen.cooperative) + Number(komponen.incomeTax);
  return { bruto, potongan, netto: bruto - potongan };
}

export const rupiah = (value: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
