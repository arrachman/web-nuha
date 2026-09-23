import type { Page } from '@playwright/test';
import { prisma } from '../../lib/prisma';

/**
 * Semua akun seed bawaan `mustChangePassword=true` (Fase A). Test yang perlu
 * masuk langsung ke halaman staf mematikannya sementara lalu mengembalikannya.
 */
export async function bebaskanGantiSandi(usernames: string[]): Promise<() => Promise<void>> {
  const awal = await prisma.user.findMany({ where: { username: { in: usernames } }, select: { username: true, mustChangePassword: true } });
  await prisma.user.updateMany({ where: { username: { in: usernames } }, data: { mustChangePassword: false } });
  return async () => {
    for (const u of awal) await prisma.user.update({ where: { username: u.username! }, data: { mustChangePassword: u.mustChangePassword } });
  };
}

/** Pilih <option> yang teksnya memuat `teks` (label opsi di app sering berisi kode + nama). */
export async function pilihOpsi(page: Page, selector: string, teks: string): Promise<void> {
  const value = await page.locator(selector).evaluate((el, t) => {
    const opt = [...(el as HTMLSelectElement).options].find((o) => o.textContent?.includes(t));
    return opt?.value ?? null;
  }, teks);
  if (value == null) throw new Error(`Opsi "${teks}" tidak ada di ${selector}`);
  await page.locator(selector).selectOption(value);
}

export { prisma };
