import { test, expect } from '@playwright/test';
import { prisma } from '../../lib/prisma';
import { loginSebagai, pasangPencatatError } from './helpers';

/**
 * Sisi panitia — dipakai superadmin karena akun demo untuk ketua/kepala unit
 * belum ada di seed sandbox ini (hanya superadmin + guru.1..10). superadmin
 * sengaja `mustChangePassword=true` bawaan (lihat smoke.spec.ts); di sini
 * dimatikan sementara supaya bisa masuk langsung ke halaman staf, lalu
 * dikembalikan di afterAll supaya tidak mengubah perilaku default akun itu.
 */
test.describe('panel panitia rekrutmen', () => {
  let lamaranId: bigint;

  test.beforeAll(async () => {
    await prisma.user.update({ where: { username: 'superadmin' }, data: { mustChangePassword: false } });
    // Buat lamaran lewat Prisma langsung (bukan wizard publik) — test ini
    // fokus menguji sisi panitia, bukan mengulang alur pelamar yang sudah
    // dicakup tests/e2e/rekrutmen.spec.ts.
    const job = await prisma.jobPosting.findUniqueOrThrow({ where: { code: 'LOW-2026-0001' } });
    const lamaran = await prisma.jobApplication.create({
      data: {
        number: `LMR-TEST-${Date.now()}`,
        jobId: job.id,
        nik: String(Date.now()).slice(-16).padStart(16, '7'),
        fullName: 'Ahmad Fulan Playwright',
        gender: 'L',
        birthPlace: 'Malang',
        birthDate: new Date('1995-05-05'),
        phone: '081234567890',
        addressLine: 'Jl. Testing No. 1',
        lastEducation: 'S1',
        institution: 'Universitas Negeri Malang',
        graduationYear: 2020,
        consentAt: new Date(),
        statusToken: `tok-${Date.now()}`,
      },
    });
    lamaranId = lamaran.id;
    await prisma.applicationEvent.create({ data: { applicationId: lamaran.id, toStatus: 'Submitted', note: 'Dibuat oleh test panitia.' } });
  });
  test.afterAll(async () => {
    await prisma.user.update({ where: { username: 'superadmin' }, data: { mustChangePassword: true } });
    if (lamaranId) {
      await prisma.applicationScore.deleteMany({ where: { applicationId: lamaranId } });
      await prisma.applicationEvent.deleteMany({ where: { applicationId: lamaranId } });
      const lamaran = await prisma.jobApplication.findUnique({ where: { id: lamaranId } });
      if (lamaran?.personId) {
        await prisma.user.deleteMany({ where: { personId: lamaran.personId } });
        await prisma.staff.deleteMany({ where: { personId: lamaran.personId } });
        await prisma.jobApplication.update({ where: { id: lamaranId }, data: { personId: null } });
        await prisma.person.deleteMany({ where: { id: lamaran.personId } });
      }
      await prisma.jobApplication.delete({ where: { id: lamaranId } });
    }
    await prisma.jobPosting.deleteMany({ where: { title: 'Staf Tata Usaha Playwright' } });
    await prisma.$disconnect();
  });

  test('panitia bisa membuat lowongan, memprosesnya, dan konversi pelamar jadi pegawai', async ({ page }) => {
    const errors = pasangPencatatError(page);
    await loginSebagai(page, 'superadmin');
    await expect(page).toHaveURL('/');

    await page.goto('/rekrutmen');
    await expect(page.locator('h2.judul-hal').first()).toContainText('Rekrutmen');

    // Tab Lowongan: buat lowongan baru berstatus Draf, ajukan, lalu setujui.
    await page.locator('.field:has(label:text-is("Judul posisi *")) input').fill('Staf Tata Usaha Playwright');
    await page.locator('.field:has(label:text-is("Jenis hubungan kerja *")) input').fill('Kontrak');
    await page.locator('.field:has(label:text-is("Pendidikan minimal *")) input').fill('D3');
    await page.locator('.field:has(label:text-is("Tanggal buka *")) input').fill('2026-01-01');
    await page.locator('.field:has(label:text-is("Tanggal tutup *")) input').fill('2026-12-31');
    await page.locator('.field:has(label:text-is("Deskripsi pekerjaan *")) textarea').fill('Mengelola administrasi harian.');
    await page.locator('.field:has(label:text-is("Persyaratan *")) textarea').fill('D3 segala jurusan.');
    await page.getByRole('button', { name: 'Buat sebagai Draf' }).click();

    await expect(page.getByText('Staf Tata Usaha Playwright')).toBeVisible();
    await page.getByRole('button', { name: 'Ajukan' }).click();
    await expect(page.getByText('Menunggu Persetujuan')).toBeVisible();
    await page.getByRole('button', { name: 'Setujui & Buka' }).click();
    await expect(page.getByText('Dibuka').first()).toBeVisible();

    // Tab Pelamar: buka lamaran demo LOW-2026-0001 lewat pencarian.
    await page.goto('/rekrutmen?tab=pelamar');
    await page.locator('input[name="q"]').fill('Ahmad Fulan Playwright');
    await page.getByRole('button', { name: 'Cari' }).click();
    const baris = page.locator('tr', { hasText: 'Ahmad Fulan Playwright' }).first();
    if (await baris.count() === 0) {
      test.skip(true, 'Tidak ada lamaran demo — jalankan tests/e2e/rekrutmen.spec.ts dulu untuk membuat datanya.');
    }
    await baris.getByRole('link', { name: 'Detail' }).click();

    await expect(page.locator('h2.judul-hal').first()).toContainText('Ahmad Fulan Playwright');
    await page.locator('select[name="status"]').selectOption('Screening');
    await page.getByRole('button', { name: 'Simpan Status' }).click();
    await expect(page.getByText('Diperiksa Berkas').first()).toBeVisible();

    await page.locator('select[name="status"]').selectOption('Hired');
    await page.getByRole('button', { name: 'Simpan Status' }).click();
    await expect(page.getByRole('button', { name: 'Konversi jadi Pegawai' })).toBeVisible();
    await page.getByRole('button', { name: 'Konversi jadi Pegawai' }).click();
    await expect(page.getByText('Sudah dikonversi jadi pegawai')).toBeVisible();

    expect(errors.filter((e) => !e.includes('favicon'))).toEqual([]);
  });
});
