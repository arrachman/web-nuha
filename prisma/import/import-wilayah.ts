import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PrismaClient, RegionLevel } from '@prisma/client';
import { rebuildRegionPaths } from '../wilayah-path';

type Row = {
  code: string;
  name: string;
  level: RegionLevel;
  parentCode?: string | null;
  typeLabel?: string | null;
  postalCode?: string | null;
};

type Input = {
  metadata: {
    source: string;
    version: string;
    sha256?: string;
    expectedCounts?: Partial<Record<RegionLevel, number>>;
  };
  country: { iso2: string; iso3: string; name: string; numericCode?: string };
  rows: Row[];
};

const LEVEL_ORDER: RegionLevel[] = ['Province', 'City', 'District', 'Village'];
const PARENT_LEVEL: Partial<Record<RegionLevel, RegionLevel>> = {
  City: 'Province',
  District: 'City',
  Village: 'District',
};

function argumen(nama: string): string | undefined {
  const index = process.argv.indexOf(nama);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function gagal(pesan: string): never {
  throw new Error(`Import wilayah ditolak: ${pesan}`);
}

function validasi(input: Input, sha256: string): void {
  if (!input.metadata?.source?.trim()) gagal('metadata.source wajib diisi.');
  if (!input.metadata?.version?.trim()) gagal('metadata.version wajib diisi.');
  if (input.metadata.sha256 && input.metadata.sha256.toLowerCase() !== sha256) {
    gagal(`sha256 tidak cocok; berkas memiliki ${sha256}.`);
  }
  if (!input.country?.iso2 || !input.country.iso3 || !input.country.name) gagal('country tidak lengkap.');
  if (!Array.isArray(input.rows) || input.rows.length === 0) gagal('rows tidak boleh kosong.');

  const codes = new Set<string>();
  const byCode = new Map<string, Row>();
  for (const [index, row] of input.rows.entries()) {
    if (!row.code || !/^[0-9A-Za-z.-]{1,20}$/.test(row.code)) gagal(`kode baris ${index + 1} tidak valid.`);
    if (!row.name?.trim()) gagal(`nama baris ${index + 1} kosong.`);
    if (!LEVEL_ORDER.includes(row.level)) gagal(`tingkat baris ${index + 1} tidak valid.`);
    if (codes.has(row.code)) gagal(`kode duplikat: ${row.code}.`);
    codes.add(row.code);
    byCode.set(row.code, row);
  }

  for (const row of input.rows) {
    const parentLevel = PARENT_LEVEL[row.level];
    if (!parentLevel) {
      if (row.parentCode) gagal(`provinsi ${row.code} tidak boleh punya parentCode.`);
      continue;
    }
    if (!row.parentCode) gagal(`${row.level} ${row.code} wajib memiliki parentCode.`);
    const parent = byCode.get(row.parentCode);
    if (!parent) gagal(`parent ${row.parentCode} untuk ${row.code} tidak ditemukan.`);
    if (parent.level !== parentLevel) gagal(`parent ${row.parentCode} untuk ${row.code} harus ${parentLevel}.`);
  }

  for (const level of LEVEL_ORDER) {
    const actual = input.rows.filter((row) => row.level === level).length;
    const expected = input.metadata.expectedCounts?.[level];
    if (expected !== undefined && actual !== expected) gagal(`jumlah ${level} ${actual}, expected ${expected}.`);
  }
}

async function main() {
  const file = argumen('--file');
  const apply = process.argv.includes('--apply');
  if (!file) gagal('gunakan --file <json>.');

  const bytes = await readFile(file);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const input = JSON.parse(bytes.toString()) as Input;
  validasi(input, sha256);

  const counts = Object.fromEntries(LEVEL_ORDER.map((level) => [level, input.rows.filter((row) => row.level === level).length]));
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', source: input.metadata, sha256, counts }, null, 2));
  if (!apply) return;

  const prisma = new PrismaClient();
  try {
    const country = await prisma.country.upsert({
      where: { iso2: input.country.iso2.toUpperCase() },
      create: {
        iso2: input.country.iso2.toUpperCase(),
        iso3: input.country.iso3.toUpperCase(),
        name: input.country.name,
        numericCode: input.country.numericCode,
      },
      update: { iso3: input.country.iso3.toUpperCase(), name: input.country.name, numericCode: input.country.numericCode },
    });
    const regionIds = new Map<string, bigint>();
    for (const level of LEVEL_ORDER) {
      for (const row of input.rows.filter((item) => item.level === level)) {
        const parentId = row.parentCode ? regionIds.get(row.parentCode) : undefined;
        if (row.parentCode && !parentId) gagal(`parent ${row.parentCode} belum tersedia saat menulis ${row.code}.`);
        const region = await prisma.region.upsert({
          where: { countryId_code: { countryId: country.id, code: row.code } },
          create: {
            countryId: country.id,
            parentId,
            level: row.level,
            code: row.code,
            name: row.name.trim(),
            typeLabel: row.typeLabel?.trim() || null,
            postalCode: row.postalCode || null,
            isActive: true,
          },
          update: {
            parentId,
            level: row.level,
            name: row.name.trim(),
            typeLabel: row.typeLabel?.trim() || null,
            postalCode: row.postalCode || null,
            isActive: true,
          },
          select: { id: true },
        });
        regionIds.set(row.code, region.id);
      }
    }
    await rebuildRegionPaths(prisma, country.id);
    console.log(`Import wilayah selesai: ${input.rows.length} baris untuk ${country.name}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
