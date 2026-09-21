import type { PrismaClient } from '@prisma/client';

/**
 * Isi ulang pintasan leluhur (provinsiId/kotaId/kecamatanId/kedalaman/namaLengkap)
 * untuk satu negara. Wajib dijalankan setelah impor atau penambahan wilayah baru —
 * kolom ini tidak boleh diisi manual karena mengganti pola 4x self-join per baris
 * jadi filter langsung.
 */
export async function rebuildRegionPaths(prisma: PrismaClient, countryId: number): Promise<void> {
  const allRegions = await prisma.region.findMany({
    where: { countryId },
    select: { id: true, parentId: true, level: true, name: true, typeLabel: true },
  });
  const provinces = new Map<bigint, { provinceId: bigint; cityId: null; districtId: null; depth: number; fullName: string }>();
  const cities = new Map<bigint, { provinceId: bigint; cityId: bigint; districtId: null; depth: number; fullName: string }>();
  const districts = new Map<bigint, { provinceId: bigint; cityId: bigint; districtId: bigint; depth: number; fullName: string }>();

  for (const region of allRegions) {
    if (region.level === 'Province') provinces.set(region.id, { provinceId: region.id, cityId: null, districtId: null, depth: 1, fullName: region.name });
  }
  for (const region of allRegions) {
    if (region.level !== 'City' || !region.parentId) continue;
    const parent = provinces.get(region.parentId);
    if (!parent) continue;
    cities.set(region.id, { provinceId: parent.provinceId, cityId: region.id, districtId: null, depth: 2, fullName: `${region.typeLabel ?? ''} ${region.name}, ${parent.fullName}`.trim() });
  }
  for (const region of allRegions) {
    if (region.level !== 'District' || !region.parentId) continue;
    const parent = cities.get(region.parentId);
    if (!parent) continue;
    districts.set(region.id, { provinceId: parent.provinceId, cityId: parent.cityId, districtId: region.id, depth: 3, fullName: `${region.name}, ${parent.fullName}` });
  }

  const updates: { id: bigint; data: Record<string, unknown> }[] = [];
  for (const region of allRegions) {
    if (region.level === 'Province') {
      const path = provinces.get(region.id)!;
      updates.push({ id: region.id, data: { provinceId: path.provinceId, cityId: null, districtId: null, depth: path.depth, fullName: path.fullName } });
    } else if (region.level === 'City') {
      const path = cities.get(region.id);
      if (path) updates.push({ id: region.id, data: { provinceId: path.provinceId, cityId: path.cityId, districtId: null, depth: path.depth, fullName: path.fullName } });
    } else if (region.level === 'District') {
      const path = districts.get(region.id);
      if (path) updates.push({ id: region.id, data: { provinceId: path.provinceId, cityId: path.cityId, districtId: path.districtId, depth: path.depth, fullName: path.fullName } });
    } else if (region.level === 'Village' && region.parentId) {
      const parent = districts.get(region.parentId);
      if (!parent) continue;
      const fullName = `${region.typeLabel ?? ''} ${region.name}, ${parent.fullName}`.trim();
      updates.push({ id: region.id, data: { provinceId: parent.provinceId, cityId: parent.cityId, districtId: parent.districtId, depth: 4, fullName } });
    }
  }

  for (const item of updates) {
    await prisma.region.update({ where: { id: item.id }, data: item.data });
  }
}
