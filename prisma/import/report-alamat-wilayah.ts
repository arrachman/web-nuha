import { writeFile } from 'node:fs/promises';
import { prisma } from '@/lib/prisma';

type ReportRow = {
  personId: string;
  fullName: string;
  addressLine: string;
  hasForeignAddress: boolean;
  action: 'manual-review';
  reason: 'free-text-not-auto-mapped' | 'domestic-and-foreign-address-present';
};

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const output = argument('--file');
  if (!output) throw new Error('Gunakan --file <path.json>.');

  const people = await prisma.person.findMany({
    where: { regionId: null, addressLine: { not: null } },
    select: { id: true, fullName: true, addressLine: true, foreignAddress: { select: { id: true } } },
    orderBy: { id: 'asc' },
  });
  const rows: ReportRow[] = people
    .filter((person) => person.addressLine?.trim())
    .map((person) => ({
      personId: String(person.id),
      fullName: person.fullName,
      addressLine: person.addressLine!.trim(),
      hasForeignAddress: person.foreignAddress !== null,
      action: 'manual-review',
      reason: person.foreignAddress !== null ? 'domestic-and-foreign-address-present' : 'free-text-not-auto-mapped',
    }));

  await writeFile(output, `${JSON.stringify({ generatedAt: new Date().toISOString(), autoMapped: 0, rows }, null, 2)}\n`);
  console.log(`Laporan alamat selesai: ${rows.length} baris; tidak ada regionId yang diubah.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
