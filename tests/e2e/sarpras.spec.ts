import path from 'node:path';
import { test, expect, type Browser } from '@playwright/test';
import { loginSebagai, pasangPencatatError } from './helpers';
import { bebaskanGantiSandi, pilihOpsi, prisma } from './db';

/**
 * 04-aset-sarpras §12: registrasi aset → label QR → guru scan QR ruang dari
 * viewport ponsel → lapor kerusakan + foto → sarpras menugaskan → teknisi
 * menyelesaikan → kondisi aset kembali Baik; tiap langkah dicek ke DB & audit.
 * Plus kasus negatif: kolom harga tersembunyi, form unit dimanipulasi, bentrok
 * peminjaman, penghapusan aset wakaf tanpa BA.
 */
const AKUN = ['sarpras.ma', 'sarpras.smp', 'sarpras.yayasan', 'guru.1', 'teknisi.1', 'superadmin'];
const NAMA_ASET = 'Mikroskop Playwright';
let pulihkan: () => Promise<void>;
let mulai: Date;

async function konteksHp(browser: Browser) {
  return browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
}

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  mulai = new Date();
  pulihkan = await bebaskanGantiSandi(AKUN);
});

test.afterAll(async () => {
  await pulihkan();
  const aset = await prisma.asset.findMany({ where: { name: { contains: 'Playwright' } }, select: { id: true } });
  const ids = aset.map((a) => a.id);
  await prisma.damageReport.deleteMany({ where: { OR: [{ assetId: { in: ids } }, { createdAt: { gte: mulai } }] } });
  const loans = await prisma.assetLoan.findMany({ where: { createdAt: { gte: mulai } }, select: { id: true } });
  await prisma.approvalStep.deleteMany({ where: { entity: 'loan', entityId: { in: loans.map((l) => l.id) } } });
  await prisma.assetLoan.deleteMany({ where: { id: { in: loans.map((l) => l.id) } } });
  const pgd = await prisma.procurement.findMany({ where: { title: { contains: 'Playwright' } }, select: { id: true } });
  const opn = await prisma.stockOpname.findMany({ where: { startedAt: { gte: mulai } }, select: { id: true } });
  const hps = await prisma.assetDisposal.findMany({ where: { createdAt: { gte: mulai } }, select: { id: true } });
  await prisma.approvalStep.deleteMany({ where: { OR: [{ entity: 'procurement', entityId: { in: pgd.map((x) => x.id) } }, { entity: 'disposal', entityId: { in: hps.map((x) => x.id) } }] } });
  await prisma.stockOpname.deleteMany({ where: { id: { in: opn.map((x) => x.id) } } });
  await prisma.assetDisposal.deleteMany({ where: { id: { in: hps.map((x) => x.id) } } });
  await prisma.assetMovement.deleteMany({ where: { assetId: { in: ids } } });
  await prisma.asset.deleteMany({ where: { id: { in: ids } } });
  await prisma.procurement.deleteMany({ where: { id: { in: pgd.map((x) => x.id) } } });
  await prisma.$disconnect();
});

test('registrasi aset → QR ruang di HP → lapor kerusakan → ditangani sampai kondisi Baik', async ({ page, browser }) => {
  test.setTimeout(180_000);
  const errors = pasangPencatatError(page);

  // 1. Sarpras MA meregistrasi aset baru di Lab IPA MA.
  await loginSebagai(page, 'sarpras.ma');
  await page.goto('/sarpras/aset/baru');
  await page.locator('input[name="name"]').fill(NAMA_ASET);
  await pilihOpsi(page, 'select[name="categoryId"]', 'B.05.01');
  await pilihOpsi(page, 'select[name="ownerUnitId"]', 'MA');
  await pilihOpsi(page, 'select[name="locationId"]', 'Lab IPA MA');
  await page.locator('input[name="acquisitionDate"]').fill('2026-07-15');
  await page.locator('input[name="acquisitionCost"]').fill('3500000');
  await pilihOpsi(page, 'select[name="fundingSourceId"]', 'BOS Madrasah');
  await page.getByRole('button', { name: /Simpan & bangkitkan kode/ }).click();
  await expect(page.getByTestId('pesan-aksi')).toContainText('berhasil diregistrasi');
  await expect(page).toHaveURL(/\/sarpras\/aset\/\d+/);

  const aset = await prisma.asset.findFirstOrThrow({ where: { name: NAMA_ASET }, include: { movements: true, ownerUnit: true } });
  expect(aset.inventoryCode).toMatch(/^NH\/MA\/B\.05\.01\/2026\/\d{4}$/);
  expect(aset.ownerUnit.key).toBe('MA');
  expect(aset.movements.map((m) => m.type)).toContain('Registrasi');
  expect(await prisma.auditLog.count({ where: { aksi: 'SARPRAS_ASET_REGISTRASI', entitasId: String(aset.id) } })).toBe(1);
  await expect(page.getByTestId('qr-aset').locator('svg')).toBeVisible();

  // 2. Label QR tercetak.
  await page.goto(`/cetak/label-aset?id=${aset.id}`);
  await expect(page.getByTestId('label-aset')).toHaveCount(1);
  await expect(page.getByTestId('label-aset')).toContainText(aset.inventoryCode);

  // 3. Guru memindai QR ruang Lab IPA dari ponsel, lalu melapor kerusakan dengan foto.
  const lab = await prisma.assetLocation.findUniqueOrThrow({ where: { code: 'G-B.2.01' } });
  const hp = await konteksHp(browser);
  const guru = await hp.newPage();
  const errorsGuru = pasangPencatatError(guru);
  await guru.goto(`/r/${lab.qrToken}`);
  await expect(guru.getByTestId('aset-ruang')).toContainText(NAMA_ASET);
  await guru.locator('li', { hasText: NAMA_ASET }).getByRole('link', { name: 'Lapor rusak' }).click();
  await expect(guru).toHaveURL(/\/login\?next=/);
  await guru.getByLabel('Email atau nama pengguna').fill('guru.1');
  await guru.getByLabel('Kata sandi').fill('Nuha2026!');
  await guru.getByRole('button', { name: /masuk/i }).click();
  await expect(guru).toHaveURL(/\/lapor-kerusakan\?aset=/);
  await expect(guru.getByTestId('target-lapor')).toContainText(NAMA_ASET);
  await guru.locator('textarea[name="description"]').fill('Lensa objektif retak, fokus tidak bisa diatur.');
  await guru.locator('label', { hasText: 'Berat' }).first().click();
  await guru.locator('input[name="foto"]').setInputFiles(path.join(__dirname, 'fixtures', 'dummy.png'));
  await guru.getByRole('button', { name: 'Kirim laporan' }).click();
  await expect(guru.getByTestId('pesan-aksi')).toContainText('terkirim');
  const laporan = await prisma.damageReport.findFirstOrThrow({ where: { assetId: aset.id }, include: { reporter: true } });
  expect(laporan.reporter.username).toBe('guru.1');
  expect(laporan.severity).toBe('Berat');
  expect(laporan.photoFileId).not.toBeNull();
  expect(laporan.locationId).toBe(lab.id);
  expect(errorsGuru.filter((e) => !e.includes('favicon'))).toEqual([]);
  await hp.close();

  // 4. Sarpras MA memverifikasi & menugaskan teknisi.
  const teknisi = await prisma.user.findUniqueOrThrow({ where: { username: 'teknisi.1' } });
  await page.goto(`/sarpras?tab=kerusakan&id=${laporan.id}`);
  const tiket = page.getByTestId(`tiket-${laporan.code}`);
  await tiket.locator('select[name="status"]').selectOption('Dikerjakan');
  await tiket.locator('select[name="assignedTo"]').selectOption(String(teknisi.id));
  await tiket.getByRole('button', { name: 'Simpan' }).click();
  await expect(page.getByTestId('pesan-aksi')).toContainText('Dikerjakan');
  let a = await prisma.asset.findUniqueOrThrow({ where: { id: aset.id } });
  expect(a.condition).toBe('RusakBerat');
  expect(a.status).toBe('DalamPerbaikan');
  expect((await prisma.damageReport.findUniqueOrThrow({ where: { id: laporan.id } })).assignedTo).toBe(teknisi.id);

  // 5. Teknisi menutup tiket → aset kembali Baik & Aktif.
  await page.context().clearCookies();
  await loginSebagai(page, 'teknisi.1');
  await page.goto('/sarpras?tab=kerusakan');
  const tiketTeknisi = page.getByTestId(`tiket-${laporan.code}`);
  await tiketTeknisi.locator('summary').click();
  await tiketTeknisi.locator('select[name="status"]').selectOption('Selesai');
  await tiketTeknisi.locator('input[name="cost"]').fill('250000');
  await tiketTeknisi.locator('input[name="resolutionNote"]').fill('Lensa diganti.');
  await tiketTeknisi.getByRole('button', { name: 'Simpan' }).click();
  await expect(page.getByTestId('pesan-aksi')).toContainText('Selesai');
  a = await prisma.asset.findUniqueOrThrow({ where: { id: aset.id } });
  expect(a.condition).toBe('Baik');
  expect(a.status).toBe('Aktif');
  const selesai = await prisma.damageReport.findUniqueOrThrow({ where: { id: laporan.id } });
  expect(selesai.status).toBe('Selesai');
  expect(Number(selesai.cost)).toBe(250000);
  expect(await prisma.auditLog.count({ where: { aksi: 'SARPRAS_KERUSAKAN_TANGANI', entitasId: String(laporan.id) } })).toBe(2);

  expect(errors.filter((e) => !e.includes('favicon'))).toEqual([]);
});

test('guru tidak melihat kolom harga dan tab pengelola', async ({ page }) => {
  await loginSebagai(page, 'guru.1');
  await page.goto('/sarpras?tab=aset');
  await expect(page.locator('nav.tabbar')).not.toContainText('Master');
  await expect(page.locator('nav.tabbar')).not.toContainText('Dashboard');
  await expect(page.locator('th', { hasText: 'Harga perolehan' })).toHaveCount(0);
  await expect(page.getByTestId('kolom-harga')).toHaveCount(0);
  // Aset yang tidak ia PIC-i / pegang tidak bisa dibuka lewat URL langsung.
  const proyektor = await prisma.asset.findUniqueOrThrow({ where: { inventoryCode: 'NH/SMP/B.02.03/2024/0001' } });
  const res = await page.goto(`/sarpras/aset/${proyektor.id}`);
  expect(res?.status()).toBe(404);
});

test('sarpras SMP tidak bisa mendaftarkan aset milik MA lewat form yang dimanipulasi', async ({ page }) => {
  const ma = await prisma.unit.findUniqueOrThrow({ where: { key: 'MA' } });
  await loginSebagai(page, 'sarpras.smp');
  await page.goto('/sarpras/aset/baru');
  await expect(page.locator('select[name="ownerUnitId"] option')).toHaveCount(1); // hanya SMP
  await page.locator('select[name="ownerUnitId"]').evaluate((el, id) => {
    const opt = document.createElement('option'); opt.value = String(id); opt.textContent = 'MA (sisipan)';
    el.appendChild(opt); (el as HTMLSelectElement).value = String(id);
  }, ma.id);
  await page.locator('input[name="name"]').fill('Aset Sisipan Playwright');
  await pilihOpsi(page, 'select[name="categoryId"]', 'B.02.01');
  await pilihOpsi(page, 'select[name="locationId"]', 'Kelas 7A');
  await page.locator('input[name="acquisitionDate"]').fill('2026-01-01');
  await page.locator('input[name="acquisitionCost"]').fill('1000000');
  await page.getByRole('button', { name: /Simpan & bangkitkan kode/ }).click();
  await expect(page.getByTestId('galat-aksi')).toContainText('di luar cakupan');
  expect(await prisma.asset.count({ where: { name: 'Aset Sisipan Playwright' } })).toBe(0);
});

test('peminjaman ruang yang bentrok waktu ditolak server', async ({ page }) => {
  await loginSebagai(page, 'sarpras.yayasan');
  const besok = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const ajukan = async (mulaiJam: string, selesaiJam: string) => {
    await page.goto('/sarpras?tab=peminjaman');
    await page.locator('input[name="startAt"]').fill(`${besok}T${mulaiJam}`);
    await page.locator('input[name="endAt"]').fill(`${besok}T${selesaiJam}`);
    await page.locator('input[name="purpose"]').fill('Rapat Playwright');
    await page.locator('label', { hasText: 'Aula Yayasan' }).locator('input').check();
    await page.getByRole('button', { name: 'Ajukan peminjaman' }).click();
  };
  await ajukan('09:00', '11:00');
  await expect(page.getByTestId('pesan-aksi')).toContainText('diajukan');
  await ajukan('10:00', '12:00');
  await expect(page.getByTestId('galat-aksi')).toContainText('Bentrok jadwal');
  expect(await prisma.assetLoan.count({ where: { purpose: 'Rapat Playwright' } })).toBe(1);
});

test('penghapusan aset wakaf tanpa lampiran BA ditolak', async ({ page }) => {
  await loginSebagai(page, 'sarpras.yayasan');
  await page.goto('/sarpras?tab=penghapusan');
  const wakaf = await prisma.asset.findUniqueOrThrow({ where: { inventoryCode: 'NH/YAYASAN/B.03.02/2022/0001' } });
  await page.locator('summary', { hasText: 'Aset lain' }).click();
  await page.locator(`input[name="assetIds"][value="${wakaf.id}"]`).check();
  await page.locator('textarea[name="note"]').fill('Sound system sudah tidak layak.');
  await page.getByRole('button', { name: 'Ajukan usulan' }).click();
  await expect(page.getByTestId('galat-aksi')).toContainText('lampiran berita acara');
  expect((await prisma.asset.findUniqueOrThrow({ where: { id: wakaf.id } })).status).toBe('Aktif');
});

test('pengadaan berjenjang → diterima jadi aset → opname memindah lokasi → penghapusan penuh → ekspor', async ({ page, browser }) => {
  test.setTimeout(240_000);
  const errors = pasangPencatatError(page);
  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await loginSebagai(admin, 'superadmin');
  const putuskanSemua = async (tab: string, testId: string, tombol: RegExp, kali: number) => {
    for (let i = 0; i < kali; i++) {
      await admin.goto(`/sarpras?tab=${tab}`);
      await admin.getByTestId(testId).getByRole('button', { name: tombol }).click();
      await expect(admin.getByTestId('pesan-aksi')).toBeVisible();
    }
  };

  // Pengadaan SMP Rp 1,2 jt dana yayasan → jenjang kepsmp → bendahara (di bawah ambang ketua).
  await loginSebagai(page, 'sarpras.smp');
  await page.goto('/sarpras?tab=pengadaan');
  await page.locator('summary', { hasText: 'Ajukan pengadaan baru' }).click();
  await page.locator('input[name="title"]').fill('Kipas kelas Playwright');
  await page.locator('input[name="reason"]').fill('Kelas 7A panas.');
  await pilihOpsi(page, 'select[name="fundingSourceId"]', 'Kas Yayasan');
  await page.getByLabel('Nama barang 1').fill('Kipas Playwright');
  await pilihOpsi(page, 'select[aria-label="Kategori barang 1"]', 'B.03.01');
  await page.getByLabel('Jumlah barang 1').fill('2');
  await page.getByLabel('Harga barang 1').fill('600000');
  await page.getByRole('button', { name: 'Ajukan', exact: true }).click();
  await expect(page.getByTestId('pesan-aksi')).toContainText('kepsmp → bendahara');
  const pgd = await prisma.procurement.findFirstOrThrow({ where: { title: 'Kipas kelas Playwright' } });
  expect(await prisma.approvalStep.count({ where: { entity: 'procurement', entityId: pgd.id } })).toBe(2);

  await putuskanSemua('pengadaan', `pengadaan-${pgd.code}`, /^Setujui$/, 2);
  expect((await prisma.procurement.findUniqueOrThrow({ where: { id: pgd.id } })).status).toBe('Disetujui');

  await page.goto('/sarpras?tab=pengadaan');
  await page.getByTestId(`pengadaan-${pgd.code}`).getByRole('button', { name: 'Tandai sudah dibeli' }).click();
  await expect(page.getByTestId('pesan-aksi')).toContainText('dibeli');
  await pilihOpsi(page, `[data-testid="pengadaan-${pgd.code}"] select[name="locationId"]`, 'Kelas 7A');
  await page.getByTestId(`pengadaan-${pgd.code}`).getByRole('button', { name: /Terima/ }).click();
  await expect(page.getByTestId('pesan-aksi')).toContainText('1 aset otomatis diregistrasi');
  const kipas = await prisma.asset.findFirstOrThrow({ where: { name: 'Kipas Playwright' } });
  expect(kipas.quantity).toBe(2); // di bawah ambang kapitalisasi → kolektif
  expect(kipas.procurementId).toBe(pgd.id);

  // Opname Kelas 7A: kipas ternyata ada di Kantor TU → ditutup → mutasi otomatis.
  const kelas7a = await prisma.assetLocation.findUniqueOrThrow({ where: { code: 'G-A.1.01' } });
  const tu = await prisma.assetLocation.findUniqueOrThrow({ where: { code: 'G-A.1.02' } });
  await page.goto('/sarpras?tab=opname');
  await page.locator('select[name="locationId"]').selectOption(String(kelas7a.id));
  await page.getByRole('button', { name: 'Buka opname' }).click();
  await expect(page).toHaveURL(/\/sarpras\/opname\/\d+/);
  const baris = page.getByTestId(`opname-${kipas.inventoryCode}`);
  await baris.locator('select[name="locationFoundId"]').selectOption(String(tu.id));
  await baris.getByRole('button', { name: 'Ada', exact: true }).click();
  await expect(page.getByTestId('pesan-aksi')).toContainText('tersimpan');
  await page.getByRole('button', { name: 'Tutup opname' }).click();
  await expect(page.getByTestId('pesan-aksi')).toContainText('1 mutasi lokasi');
  expect((await prisma.asset.findUniqueOrThrow({ where: { id: kipas.id } })).locationId).toBe(tu.id);
  expect(await prisma.assetMovement.count({ where: { assetId: kipas.id, type: 'PindahLokasi', reason: { startsWith: 'Hasil opname' } } })).toBe(1);

  // Penghapusan: sarpras verifikasi → kepala SMP → ketua → dilaksanakan.
  await page.goto('/sarpras?tab=penghapusan');
  await page.locator('summary', { hasText: 'Aset lain' }).click();
  await page.locator(`input[name="assetIds"][value="${kipas.id}"]`).check();
  await page.locator('select[name="reason"]').selectOption('Usang');
  await page.getByRole('button', { name: 'Ajukan usulan' }).click();
  await expect(page.getByTestId('pesan-aksi')).toContainText('diajukan');
  const hps = await prisma.assetDisposal.findFirstOrThrow({ where: { items: { some: { assetId: kipas.id } } } });
  expect((await prisma.asset.findUniqueOrThrow({ where: { id: kipas.id } })).status).toBe('MenungguPenghapusan');
  await page.getByTestId(`hapus-${hps.code}`).getByRole('button', { name: 'Verifikasi' }).click();
  await expect(page.getByTestId('pesan-aksi')).toContainText('Diverifikasi');
  await putuskanSemua('penghapusan', `hapus-${hps.code}`, /^Setujui$/, 2);
  expect((await prisma.assetDisposal.findUniqueOrThrow({ where: { id: hps.id } })).status).toBe('Disetujui');
  await page.goto('/sarpras?tab=penghapusan');
  await page.getByTestId(`hapus-${hps.code}`).getByRole('button', { name: 'Laksanakan penghapusan' }).click();
  await expect(page.getByTestId('pesan-aksi')).toContainText('dilaksanakan');
  expect((await prisma.asset.findUniqueOrThrow({ where: { id: kipas.id } })).status).toBe('Dihapus');

  // Ekspor: sarpras boleh, guru tidak.
  const csv = await page.request.get('/sarpras/laporan/buku-inventaris');
  expect(csv.status()).toBe(200);
  expect(csv.headers()['content-type']).toContain('text/csv');
  expect(await csv.text()).toContain('Kode inventaris');
  await adminCtx.close();
  const guruCtx = await browser.newContext();
  const guru = await guruCtx.newPage();
  await loginSebagai(guru, 'guru.1');
  expect((await guru.request.get('/sarpras/laporan/buku-inventaris')).status()).toBe(403);
  await guruCtx.close();

  expect(errors.filter((e) => !e.includes('favicon'))).toEqual([]);
});
