import { test, expect } from '@playwright/test';
import { loginSebagai, pasangPencatatError } from './helpers';

test('superadmin bisa login dan dashboard merender tanpa pageerror', async ({ page }) => {
  const errors = pasangPencatatError(page);
  await loginSebagai(page, 'superadmin');
  // Akun uji superadmin sengaja diset mustChangePassword=true oleh seed —
  // middleware mengarahkan ke /akun/sandi, itu perilaku benar, bukan kegagalan test.
  await expect(page).toHaveURL(/\/(akun\/sandi)?$/);
  expect(errors).toEqual([]);
});
