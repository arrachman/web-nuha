import { test, expect } from '@playwright/test';
import path from 'node:path';

/**
 * Alur pelamar publik untuk lowongan LOW-2026-0001 (03 §9 checklist utama):
 * isi wizard 4 langkah dengan berkas asli (bukan simulasi), kirim, dapat
 * nomor lamaran, lalu cek statusnya. NIK acak per-run supaya test bisa
 * diulang tanpa bentrok dengan unique constraint (jobId, nik).
 */
test('pelamar publik bisa mendaftar lowongan dan cek status', async ({ page }) => {
  const nik = String(Date.now()).slice(-16).padStart(16, '9');
  const pdf = path.join(__dirname, 'fixtures/dummy.pdf');

  await page.goto('/karir/LOW-2026-0001/daftar');
  await expect(page.locator('h1')).toContainText('Guru Matematika SMP');

  // Langkah 1 — Data Diri
  await page.locator('.field:has(label:text-is("Nama lengkap *")) input, .field:has(label:text-is("Nama lengkap *")) textarea').fill('Ahmad Fulan Playwright');
  await page.locator('.field:has(label:text-is("NIK *")) input, .field:has(label:text-is("NIK *")) textarea').fill(nik);
  await page.locator('.field:has(label:text-is("Tempat lahir *")) input, .field:has(label:text-is("Tempat lahir *")) textarea').fill('Malang');
  await page.locator('.field:has(label:text-is("Tanggal lahir *")) input, .field:has(label:text-is("Tanggal lahir *")) textarea').fill('1995-05-05');
  await page.locator('.field:has(label:text-is("No. HP *")) input, .field:has(label:text-is("No. HP *")) textarea').fill('081234567890');
  await page.locator('.field:has(label:text-is("Alamat *")) input, .field:has(label:text-is("Alamat *")) textarea').fill('Jl. Testing No. 1');
  await page.getByTestId('tombol-lanjut').click();

  // Langkah 2 — Pendidikan & Pengalaman
  await expect(page.locator('h2')).toContainText('Pendidikan');
  await page.locator('select').first().selectOption('S1');
  await page.locator('.field:has(label:text-is("Institusi/Universitas *")) input, .field:has(label:text-is("Institusi/Universitas *")) textarea').fill('Universitas Negeri Malang');
  await page.getByTestId('tombol-lanjut').click();

  // Langkah 3 — Berkas: isi semua berkas wajib dengan PDF dummy
  await expect(page.locator('h2')).toContainText('Unggah Berkas');
  for (const code of ['SURAT_LAMARAN', 'CV', 'IJAZAH', 'KTP']) {
    await page.getByTestId(`doc-${code}`).setInputFiles(pdf);
  }
  await page.getByTestId('tombol-lanjut').click();

  // Langkah 4 — Pernyataan & Kirim
  await expect(page.locator('h2')).toContainText('Pernyataan');
  await page.getByTestId('consent').check();
  // Jebakan waktu di server (>2.5 detik sejak formOpenedAt) — beri jeda wajar.
  await page.waitForTimeout(2700);
  await page.getByTestId('tombol-lanjut').click();

  await expect(page.getByTestId('hasil-number')).toBeVisible({ timeout: 15000 });
  const nomor = (await page.getByTestId('hasil-number').textContent())?.trim();
  expect(nomor).toMatch(/^LMR-\d{4}-\d{4}$/);

  // Cek status publik dengan nomor yang baru didapat.
  await page.getByRole('link', { name: 'Cek status sekarang' }).click();
  await expect(page.getByTestId('hasil-status')).toBeVisible();
  await expect(page.getByTestId('hasil-status')).toContainText('Ahmad Fulan Playwright');
  await expect(page.getByTestId('hasil-status')).toContainText('Terkirim');
});

test('NIK yang sama tidak bisa melamar dua kali ke lowongan yang sama', async ({ page }) => {
  const nik = String(Date.now()).slice(-16).padStart(16, '8');
  const pdf = path.join(__dirname, 'fixtures/dummy.pdf');

  async function isiDanKirim() {
    await page.goto('/karir/LOW-2026-0001/daftar');
    await page.locator('.field:has(label:text-is("Nama lengkap *")) input, .field:has(label:text-is("Nama lengkap *")) textarea').fill('Duplikat NIK Test');
    await page.locator('.field:has(label:text-is("NIK *")) input, .field:has(label:text-is("NIK *")) textarea').fill(nik);
    await page.locator('.field:has(label:text-is("Tempat lahir *")) input, .field:has(label:text-is("Tempat lahir *")) textarea').fill('Malang');
    await page.locator('.field:has(label:text-is("Tanggal lahir *")) input, .field:has(label:text-is("Tanggal lahir *")) textarea').fill('1990-01-01');
    await page.locator('.field:has(label:text-is("No. HP *")) input, .field:has(label:text-is("No. HP *")) textarea').fill('081234567891');
    await page.locator('.field:has(label:text-is("Alamat *")) input, .field:has(label:text-is("Alamat *")) textarea').fill('Jl. Duplikat No. 2');
    await page.getByTestId('tombol-lanjut').click();
    await page.locator('select').first().selectOption('S1');
    await page.locator('.field:has(label:text-is("Institusi/Universitas *")) input, .field:has(label:text-is("Institusi/Universitas *")) textarea').fill('Universitas Negeri Malang');
    await page.getByTestId('tombol-lanjut').click();
    for (const code of ['SURAT_LAMARAN', 'CV', 'IJAZAH', 'KTP']) {
      await page.getByTestId(`doc-${code}`).setInputFiles(pdf);
    }
    await page.getByTestId('tombol-lanjut').click();
    await page.getByTestId('consent').check();
    await page.waitForTimeout(2700);
    await page.getByTestId('tombol-lanjut').click();
  }

  await isiDanKirim();
  await expect(page.getByTestId('hasil-number')).toBeVisible({ timeout: 15000 });

  await isiDanKirim();
  await expect(page.locator('.error')).toContainText('sudah pernah melamar');
});
