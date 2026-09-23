import { test, expect, type Browser } from '@playwright/test';
import { loginSebagai, pasangPencatatError } from './helpers';
import { bebaskanGantiSandi, prisma } from './db';
import { hariDariTanggal, sesiAktifPadaHari, tanggalDb, tanggalWib } from '../../lib/presensi/inti';

/**
 * 02-presensi §7: input rombel (default Hadir, izin otomatis terlindung),
 * selfie dengan kamera & GPS palsu (dalam radius, luar radius + alasan + tinjau,
 * izin lokasi ditolak), privasi foto, izin pegawai, penguncian, ekspor.
 */
const AKUN = ['guru.1', 'guru.2', 'pegawai.1', 'sdm', 'superadmin'];
const TITIK_YAYASAN = { latitude: -7.9946, longitude: 112.6392 };
const JAUH = { latitude: -7.9700, longitude: 112.6200 };
let pulihkan: () => Promise<void>;
const hariIni = tanggalWib();
const kemarin = tanggalWib(new Date(Date.now() - 86_400_000));
const besok = tanggalWib(new Date(Date.now() + 86_400_000));
let izinPondokId: bigint | null = null;

async function staffOf(username: string) {
  return prisma.staff.findFirstOrThrow({ where: { person: { user: { username } } } });
}
async function konteks(browser: Browser, geo: { latitude: number; longitude: number } | null) {
  return browser.newContext(geo ? { geolocation: { ...geo, accuracy: 20 }, permissions: ['camera', 'geolocation'] } : { permissions: ['camera'] });
}

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  pulihkan = await bebaskanGantiSandi(AKUN);
  const staf = await Promise.all(['guru.1', 'guru.2', 'pegawai.1'].map(staffOf));
  await prisma.staffAttendance.deleteMany({ where: { staffId: { in: staf.map((s) => s.id) }, date: { in: [tanggalDb(hariIni), tanggalDb(besok)] } } });
});

test.afterAll(async () => {
  await pulihkan();
  const staf = await Promise.all(['guru.1', 'guru.2', 'pegawai.1'].map(staffOf));
  await prisma.staffAttendance.deleteMany({ where: { staffId: { in: staf.map((s) => s.id) }, date: { in: [tanggalDb(hariIni), tanggalDb(besok)] } } });
  await prisma.staffLeave.deleteMany({ where: { staffId: { in: staf.map((s) => s.id) }, alasan: { contains: 'Playwright' } } });
  const santri = await prisma.santri.findMany({ where: { nis: { startsWith: 'SMP26' } }, select: { id: true } });
  await prisma.attendance.deleteMany({ where: { studentId: { in: santri.map((s) => s.id) }, date: { in: [tanggalDb(hariIni), tanggalDb(kemarin)] } } });
  if (izinPondokId) await prisma.leavePermit.delete({ where: { id: izinPondokId } }).catch(() => undefined);
  await prisma.$disconnect();
});

test('guru mengisi presensi rombelnya: default Hadir, izin pondok otomatis terlindung', async ({ page }) => {
  test.skip(!sesiAktifPadaHari(63, hariDariTanggal(hariIni)), 'Sesi sekolah tidak berlangsung hari Ahad.');
  const errors = pasangPencatatError(page);
  const santri = await prisma.santri.findMany({ where: { nis: { startsWith: 'SMP26' } }, include: { person: true }, orderBy: { person: { fullName: 'asc' } } });
  // Santri ke-3 sedang izin pulang (disetujui) → otomatis Izin, guru tanpa presensi.override tidak bisa menimpanya.
  const izin = await prisma.leavePermit.create({ data: { code: `IZN-PW-${Date.now()}`.slice(0, 24), studentId: santri[2].id, type: 'Pulang', reason: 'Acara keluarga (Playwright)', departedAt: new Date(Date.now() - 3600_000), expectedReturnAt: new Date(Date.now() + 2 * 86_400_000), status: 'Approved' } });
  izinPondokId = izin.id;

  await loginSebagai(page, 'guru.1');
  await page.goto('/presensi?tab=siswa&sesi=SEKOLAH');
  await expect(page.locator('select[name="kelas"] option')).toHaveCount(1); // hanya 7A (wali kelas)
  await expect(page.getByTestId(`santri-${santri[2].id}`)).toContainText('Izin Pulang');
  await page.getByLabel(`Alpa ${santri[0].person.fullName}`).check({ force: true });
  await page.getByLabel(`Sakit ${santri[1].person.fullName}`).check({ force: true });
  await page.getByLabel(`Hadir ${santri[2].person.fullName}`).check({ force: true }); // coba timpa izin
  await page.getByRole('button', { name: 'Simpan presensi' }).click();
  await expect(page.getByTestId('pesan-aksi')).toContainText('tersimpan (8 santri)');
  await expect(page.getByTestId('pesan-aksi')).toContainText('1 status Izin/Sakit otomatis dipertahankan');

  const rows = await prisma.attendance.findMany({ where: { date: tanggalDb(hariIni), session: 'SEKOLAH', studentId: { in: santri.map((s) => s.id) } } });
  expect(rows).toHaveLength(8);
  const st = (id: bigint) => rows.find((r) => r.studentId === id)!;
  expect(st(santri[0].id).status).toBe('Absent');
  expect(st(santri[1].id).status).toBe('Sick');
  expect(st(santri[2].id).status).toBe('Excused');
  expect(st(santri[2].id).source).toBe('IZIN');
  expect(rows.filter((r) => r.status === 'Present')).toHaveLength(5);
  const guru = await prisma.user.findUniqueOrThrow({ where: { username: 'guru.1' } });
  expect(st(santri[3].id).recordedBy).toBe(guru.id);
  expect(await prisma.auditLog.count({ where: { aksi: 'PRESENSI_SIMPAN_ROMBEL', entitasId: { contains: hariIni } } })).toBeGreaterThanOrEqual(1);
  expect(errors.filter((e) => !e.includes('favicon'))).toEqual([]);
});

test('guru tidak bisa mengisi rombel bukan miliknya maupun mengubah presensi terkunci', async ({ page }) => {
  test.skip(!sesiAktifPadaHari(63, hariDariTanggal(hariIni)) || !sesiAktifPadaHari(63, hariDariTanggal(kemarin)), 'Butuh hari sekolah hari ini & kemarin.');
  const kelas10A = await prisma.kelas.findFirstOrThrow({ where: { nama: '10A' } });
  await loginSebagai(page, 'guru.1');
  await page.goto('/presensi?tab=siswa&sesi=SEKOLAH');
  await page.locator('input[name="kelasId"]').evaluate((el, id) => { (el as HTMLInputElement).value = String(id); }, kelas10A.id);
  await page.getByRole('button', { name: 'Simpan presensi' }).click();
  await expect(page.getByTestId('galat-aksi')).toContainText('tidak berwenang mengisi presensi rombel ini');

  await page.goto(`/presensi?tab=siswa&sesi=SEKOLAH&tanggal=${kemarin}`);
  await expect(page.getByText('Presensi tanggal ini sudah terkunci.')).toBeVisible();
  await page.getByRole('button', { name: 'Simpan presensi' }).evaluate((b) => b.removeAttribute('disabled'));
  await page.getByRole('button', { name: 'Simpan presensi' }).click();
  await expect(page.getByTestId('galat-aksi')).toContainText('sudah terkunci');
  const santri = await prisma.santri.findMany({ where: { nis: { startsWith: 'SMP26' } }, select: { id: true } });
  expect(await prisma.attendance.count({ where: { date: tanggalDb(kemarin), studentId: { in: santri.map((s) => s.id) } } })).toBe(0);
});

test('pegawai check-in & check-out selfie di dalam radius — waktu server, foto & GPS tersimpan', async ({ browser }) => {
  test.setTimeout(120_000);
  const ctx = await konteks(browser, TITIK_YAYASAN);
  const page = await ctx.newPage();
  const errors = pasangPencatatError(page);
  await loginSebagai(page, 'pegawai.1');
  await page.goto('/presensi');
  await expect(page.locator('nav.tabbar')).not.toContainText('Dashboard'); // pegawai: hanya Presensi Saya
  const sebelum = Date.now();
  await page.getByRole('button', { name: 'Saya mengerti, buka kamera' }).click();
  await expect(page.getByTestId('status-gps')).toContainText('akurasi');
  await page.getByRole('button', { name: 'Ambil foto' }).click();
  await page.getByRole('button', { name: 'Kirim check-in' }).click();
  await expect(page.getByTestId('hasil-presensi')).toContainText('Check-in tercatat');

  const staff = await staffOf('pegawai.1');
  const row = await prisma.staffAttendance.findUniqueOrThrow({ where: { staffId_date: { staffId: staff.id, date: tanggalDb(hariIni) } } });
  expect(row.source).toBe('SELFIE');
  expect(row.outsideGeofence).toBe(false);
  expect(row.checkInDistanceM!).toBeLessThanOrEqual(150);
  expect(row.checkInAt!.getTime()).toBeGreaterThanOrEqual(sebelum - 5_000);
  expect(row.checkInAt!.getTime()).toBeLessThanOrEqual(Date.now() + 5_000);
  const foto = await prisma.fileObject.findUniqueOrThrow({ where: { id: row.checkInPhotoId! } });
  expect(foto.domain).toBe('presensi');
  expect(foto.mime).toBe('image/jpeg');
  expect(await prisma.auditLog.count({ where: { aksi: 'PRESENSI_CHECK_IN', entitasId: `${staff.id}:${hariIni}`, waktu: { gte: new Date(sebelum - 5_000) } } })).toBe(1);

  // Komponen memuat ulang halaman sendiri setelah sukses → kartu ringkas muncul, kamera siap untuk check-out.
  await expect(page.getByTestId('ringkas-hari-ini')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Ambil foto' }).click();
  await page.getByRole('button', { name: 'Kirim check-out' }).click();
  await expect(page.getByText(/Check-out tercatat|sudah lengkap/).first()).toBeVisible({ timeout: 15_000 });
  const akhir = await prisma.staffAttendance.findUniqueOrThrow({ where: { id: row.id } });
  expect(akhir.checkOutAt).not.toBeNull();
  expect(akhir.checkOutPhotoId).not.toBeNull();
  expect(errors.filter((e) => !e.includes('favicon'))).toEqual([]);
  await ctx.close();
});

test('check-in di luar radius wajib alasan, masuk antrean tinjau, foto hanya untuk yang berhak', async ({ browser }) => {
  test.setTimeout(150_000);
  const ctx = await konteks(browser, JAUH);
  const page = await ctx.newPage();
  await loginSebagai(page, 'guru.2');
  await page.goto('/presensi?tab=saya');
  await page.getByRole('button', { name: 'Saya mengerti, buka kamera' }).click();
  await expect(page.getByTestId('status-gps')).toContainText('akurasi');
  await page.getByRole('button', { name: 'Ambil foto' }).click();
  await page.getByRole('button', { name: 'Kirim check-in' }).click();
  await expect(page.getByTestId('hasil-presensi')).toContainText('Isi alasan');
  await page.getByLabel('Alasan di luar lokasi *').fill('Dinas luar ke Kemenag (Playwright)');
  await page.getByRole('button', { name: 'Kirim check-in' }).click();
  await expect(page.getByTestId('hasil-presensi')).toContainText('di luar lokasi');
  const staff = await staffOf('guru.2');
  const row = await prisma.staffAttendance.findUniqueOrThrow({ where: { staffId_date: { staffId: staff.id, date: tanggalDb(hariIni) } } });
  expect(row.outsideGeofence).toBe(true);
  expect(row.outsideReason).toContain('Kemenag');
  expect(row.checkInDistanceM!).toBeGreaterThan(1000);

  // Pemilik foto boleh melihat; pegawai lain 403; SDM boleh.
  expect((await page.request.get(`/berkas/${row.checkInPhotoId}`)).status()).toBe(200);
  await ctx.close();
  const lain = await browser.newContext();
  const pLain = await lain.newPage();
  await loginSebagai(pLain, 'pegawai.1');
  expect((await pLain.request.get(`/berkas/${row.checkInPhotoId}`)).status()).toBe(403);
  await lain.close();

  const sdmCtx = await browser.newContext();
  const sdm = await sdmCtx.newPage();
  await loginSebagai(sdm, 'sdm');
  expect((await sdm.request.get(`/berkas/${row.checkInPhotoId}`)).status()).toBe(200);
  await sdm.goto('/presensi?tab=tinjau');
  const kartu = sdm.getByTestId(`tinjau-${staff ? (await prisma.person.findUniqueOrThrow({ where: { id: staff.personId } })).fullName : ''}`);
  await expect(kartu).toContainText('Luar lokasi');
  await kartu.getByRole('button', { name: 'Terima' }).click();
  await expect(sdm.getByTestId('pesan-aksi')).toContainText('disetujui');
  const ditinjau = await prisma.staffAttendance.findUniqueOrThrow({ where: { id: row.id } });
  expect(ditinjau.reviewStatus).toBe('Disetujui');
  expect(ditinjau.verifiedBy).toBe((await prisma.user.findUniqueOrThrow({ where: { username: 'sdm' } })).id);
  await sdmCtx.close();
});

test('izin lokasi ditolak → presensi tidak bisa dikirim', async ({ browser }) => {
  const ctx = await konteks(browser, null);
  const page = await ctx.newPage();
  await loginSebagai(page, 'guru.1');
  await page.goto('/presensi?tab=saya');
  const tombol = page.getByRole('button', { name: 'Saya mengerti, buka kamera' });
  if (await tombol.count()) await tombol.click();
  await expect(page.getByTestId('galat-kamera')).toContainText('Lokasi tidak bisa dibaca');
  const staff = await staffOf('guru.1');
  expect(await prisma.staffAttendance.count({ where: { staffId: staff.id, date: tanggalDb(hariIni), checkInAt: { not: null } } })).toBe(0);
  await ctx.close();
});

test('izin pegawai disetujui SDM mengisi presensi otomatis; ekspor dibatasi peran', async ({ page, browser }) => {
  await loginSebagai(page, 'guru.2');
  await page.goto('/presensi?tab=saya');
  await page.locator('select[name="jenis"]').selectOption('Sakit');
  await page.locator('input[name="dari"]').fill(besok);
  await page.locator('input[name="sampai"]').fill(besok);
  await page.locator('input[name="alasan"]').fill('Demam (Playwright)');
  await page.getByRole('button', { name: 'Kirim pengajuan' }).click();
  await expect(page.getByTestId('pesan-aksi')).toContainText('menunggu persetujuan');
  const izin = await prisma.staffLeave.findFirstOrThrow({ where: { alasan: 'Demam (Playwright)' } });

  const sdmCtx = await browser.newContext();
  const sdm = await sdmCtx.newPage();
  await loginSebagai(sdm, 'sdm');
  await sdm.goto('/presensi?tab=tinjau');
  await sdm.getByTestId(`izin-${izin.id}`).getByRole('button', { name: 'Setujui' }).click();
  await expect(sdm.getByTestId('pesan-aksi')).toContainText('1 hari presensi terisi');
  const row = await prisma.staffAttendance.findUniqueOrThrow({ where: { staffId_date: { staffId: izin.staffId, date: tanggalDb(besok) } } });
  expect(row.status).toBe('Sick');
  expect(row.source).toBe('IZIN');
  const rekapPegawai = await sdm.request.get(`/presensi/ekspor/rekap-pegawai?bulan=${hariIni.slice(0, 7)}`);
  expect(rekapPegawai.status()).toBe(200);
  expect(await rekapPegawai.text()).toContain('Terlambat (menit)');
  await sdmCtx.close();

  // Guru: rekap santri hanya rombelnya (7A), rekap pegawai ditolak.
  const guruCtx = await browser.newContext();
  const guru = await guruCtx.newPage();
  await loginSebagai(guru, 'guru.1');
  const csv = await (await guru.request.get(`/presensi/ekspor/rekap-santri?bulan=${hariIni.slice(0, 7)}`)).text();
  expect(csv).toContain('7A');
  expect(csv).not.toContain('10A');
  expect((await guru.request.get(`/presensi/ekspor/rekap-pegawai?bulan=${hariIni.slice(0, 7)}`)).status()).toBe(403);
  await guruCtx.close();
});

test('dashboard presensi merender untuk pengelola (siswa & pegawai)', async ({ page }) => {
  const errors = pasangPencatatError(page);
  await loginSebagai(page, 'superadmin');
  await page.goto('/presensi?tab=dashboard');
  await expect(page.getByText('% kehadiran harian — 30 hari')).toBeVisible();
  await page.goto('/presensi?tab=dashboard&lihat=pegawai');
  await expect(page.getByText('Belum check-in sampai sekarang')).toBeVisible();
  await expect(page.getByTestId('galeri-selfie').locator('img').first()).toBeVisible();
  expect(errors.filter((e) => !e.includes('favicon'))).toEqual([]);
});
