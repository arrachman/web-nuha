import bcrypt from 'bcryptjs';
import { test, expect } from '@playwright/test';
import { loginSebagai, pasangPencatatError } from './helpers';
import { bebaskanGantiSandi, prisma } from './db';

/** Fase A sisa (01 §2.2, §3.3): reset sandi oleh admin + matriks izin per peran. */
let pulihkan: () => Promise<void>;
test.describe.configure({ mode: 'serial' });
test.beforeAll(async () => { pulihkan = await bebaskanGantiSandi(['superadmin', 'sdm']); });
test.afterAll(async () => {
  await prisma.user.update({ where: { username: 'sdm' }, data: { passwordHash: await bcrypt.hash('Nuha2026!', 12) } });
  await pulihkan();
  await prisma.$disconnect();
});

test('admin mereset sandi: sandi sementara tampil sekali, sesi lama dicabut, wajib ganti sandi', async ({ page, browser }) => {
  const errors = pasangPencatatError(page);
  // Sesi sdm yang sedang aktif di perangkat lain.
  const lainCtx = await browser.newContext();
  const lain = await lainCtx.newPage();
  await loginSebagai(lain, 'sdm');
  await lain.goto('/rekrutmen');
  await expect(lain).toHaveURL(/\/rekrutmen/);

  await loginSebagai(page, 'superadmin');
  await page.goto('/pengaturan?tab=pengguna&q=Siti');
  const sdm = await prisma.user.findUniqueOrThrow({ where: { username: 'sdm' } });
  page.once('dialog', (d) => d.accept());
  await page.getByTestId('aksi-pengguna-sdm').getByRole('button', { name: 'Reset sandi' }).click();
  const sandi = (await page.getByTestId('sandi-sementara').textContent())!.trim();
  expect(sandi.length).toBeGreaterThanOrEqual(10);
  const setelah = await prisma.user.findUniqueOrThrow({ where: { id: sdm.id } });
  expect(setelah.mustChangePassword).toBe(true);
  expect(setelah.sessionVersion).toBe(sdm.sessionVersion + 1);
  expect(await prisma.auditLog.count({ where: { aksi: 'RESET_SANDI', entitasId: String(sdm.id) } })).toBeGreaterThanOrEqual(1);

  // Sesi lama tercabut.
  await lain.goto('/rekrutmen');
  await expect(lain).toHaveURL(/\/login/);
  // Sandi lama tidak berlaku, sandi sementara berlaku dan langsung diarahkan ganti sandi.
  await loginSebagai(lain, 'sdm', sandi);
  await lain.goto('/rekrutmen');
  await expect(lain).toHaveURL(/\/akun\/sandi/);
  await lainCtx.close();
  expect(errors.filter((e) => !e.includes('favicon'))).toEqual([]);
});

test('matriks izin per peran bisa diubah dan dikembalikan, tercatat di audit', async ({ page }) => {
  await loginSebagai(page, 'superadmin');
  await page.goto('/pengaturan?tab=izin&modul=rekrutmen');
  const kotak = page.getByLabel('sdm rekrutmen.export');
  await expect(kotak).toBeChecked();
  await kotak.uncheck();
  await page.getByRole('button', { name: 'Simpan matriks rekrutmen' }).click();
  await expect(page.getByTestId('pesan-aksi')).toContainText('-1');
  const izin = await prisma.permission.findUniqueOrThrow({ where: { key: 'rekrutmen.export' } });
  const peran = await prisma.role.findUniqueOrThrow({ where: { key: 'sdm' } });
  expect(await prisma.rolePermission.count({ where: { permissionId: izin.id, roleId: peran.id } })).toBe(0);

  await page.getByLabel('sdm rekrutmen.export').check();
  await page.getByRole('button', { name: 'Simpan matriks rekrutmen' }).click();
  await expect(page.getByTestId('pesan-aksi')).toContainText('+1');
  expect(await prisma.rolePermission.count({ where: { permissionId: izin.id, roleId: peran.id } })).toBe(1);
  expect(await prisma.auditLog.count({ where: { aksi: 'IZIN_MATRIKS_UBAH', entitasId: 'rekrutmen' } })).toBeGreaterThanOrEqual(2);
});
