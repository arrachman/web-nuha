import { prisma } from '@/lib/prisma';
import { ENTITIES } from './registry';
import { PERSONA } from './persona';

export type ItemMaster = { key: string; label: string; ringkas?: string };
export type KelompokMaster = { menuKey: string; label: string; icon: string | null; items: ItemMaster[] };

/**
 * Daftar entitas Master Data yang boleh diakses satu sesi, sudah dikelompokkan
 * per modul. Dipakai bersama oleh halaman /data dan submenu sidebar, supaya
 * keduanya tidak pernah berbeda isi.
 */
export async function daftarMaster(peran: string[]): Promise<{ persona: KelompokMaster; kelompok: KelompokMaster[] }> {
  const [grants, menus] = await Promise.all([
    prisma.menuRole.findMany({ where: { role: { key: { in: peran } } }, select: { menu: { select: { key: true } } } }),
    prisma.menuItem.findMany({ select: { key: true, label: true, order: true, icon: true } }),
  ]);
  const allowed = new Set(grants.map((grant) => grant.menu.key));
  const semua = ENTITIES.filter((entity) => entity.menu === 'dashboard' || allowed.has(entity.menu));
  const menuInfo = new Map(menus.map((menu) => [menu.key, menu]));

  // Persona ditarik keluar dari kelompok modulnya: ini pintu masuk yang paling
  // sering dipakai operator, jadi ditaruh paling atas dengan penjelasannya.
  const kunciPersona = new Set(PERSONA.map((item) => item.key));
  const persona: KelompokMaster = {
    menuKey: 'induk',
    label: 'Data per peran',
    icon: menuInfo.get('induk')?.icon ?? null,
    items: PERSONA.filter((item) => semua.some((entity) => entity.key === item.key)).map((item) => ({ key: item.key, label: item.label, ringkas: item.ringkas })),
  };

  const grup = new Map<string, ItemMaster[]>();
  for (const entity of semua) {
    if (kunciPersona.has(entity.key)) continue;
    if (!grup.has(entity.menu)) grup.set(entity.menu, []);
    grup.get(entity.menu)!.push({ key: entity.key, label: entity.label });
  }
  const kelompok = [...grup.entries()]
    .sort((a, b) => (menuInfo.get(a[0])?.order ?? 999) - (menuInfo.get(b[0])?.order ?? 999))
    .map(([menuKey, items]) => ({
      menuKey,
      label: menuInfo.get(menuKey)?.label ?? menuKey,
      icon: menuInfo.get(menuKey)?.icon ?? null,
      items,
    }));

  return { persona, kelompok };
}
