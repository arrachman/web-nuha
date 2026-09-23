import type { Page } from '@playwright/test';

/**
 * Login lewat form sungguhan (bukan set-cookie manual) supaya jalur yang
 * sama persis dengan pengguna asli ikut teruji tiap kali dipakai.
 */
export async function loginSebagai(page: Page, identifier: string, password = 'Nuha2026!'): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email atau nama pengguna').fill(identifier);
  await page.getByLabel('Kata sandi').fill(password);
  await page.getByRole('button', { name: /masuk/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 10_000 });
}

/** Kumpulkan pageerror selama navigasi — dipakai memastikan tab merender bersih (CLAUDE.md §Verifikasi). */
export function pasangPencatatError(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}
