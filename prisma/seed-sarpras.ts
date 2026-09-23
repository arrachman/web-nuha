/**
 * Data demo Sarpras + akun uji peran baru (05-matriks-peran §8 checklist:
 * `sdm`, `sarpras.smp`, `sarpras.ma`, `sarpras.yayasan`, `teknisi.1`,
 * `musyrif.1`, `pegawai.1`). Idempoten; dipanggil dari prisma/seed.ts dan
 * bisa dijalankan sendiri: `npx tsx prisma/seed-sarpras.ts`.
 */
import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { JenisKelamin, PrismaClient, type AssetCondition, type LocationType } from '@prisma/client';

const AKUN_PERAN_BARU = [
  { username: 'sdm', nama: 'Siti Rahmawati', peran: 'sdm', unit: null, jabatan: 'Admin Kepegawaian', gender: JenisKelamin.P },
  { username: 'sarpras.yayasan', nama: 'Ahmad Mustofa', peran: 'sarpras', unit: null, jabatan: 'Kabag Sarpras Yayasan', gender: JenisKelamin.L },
  { username: 'sarpras.smp', nama: 'Rudi Hartono', peran: 'sarpras', unit: 'SMP', jabatan: 'Waka Sarpras SMP', gender: JenisKelamin.L },
  { username: 'sarpras.ma', nama: 'Nur Kholis', peran: 'sarpras', unit: 'MA', jabatan: 'Waka Sarpras MA', gender: JenisKelamin.L },
  { username: 'teknisi.1', nama: 'Slamet Riyadi', peran: 'teknisi', unit: 'YAYASAN', jabatan: 'Teknisi', gender: JenisKelamin.L },
  { username: 'musyrif.1', nama: 'Ust. Faiz Abdullah', peran: 'musyrif', unit: 'Pondok', jabatan: 'Musyrif Asrama Al-Fatih', gender: JenisKelamin.L },
  { username: 'pegawai.1', nama: 'Bambang Suryadi', peran: 'pegawai', unit: 'YAYASAN', jabatan: 'Staf Tata Usaha', gender: JenisKelamin.L },
];

export async function seedAkunPeranBaru(prisma: PrismaClient, passwordHash: string) {
  const units = new Map((await prisma.unit.findMany()).map((u) => [u.key, u]));
  for (const [i, a] of AKUN_PERAN_BARU.entries()) {
    const email = `${a.username}@nuha.local`;
    const role = await prisma.role.findUnique({ where: { key: a.peran } });
    if (!role) continue;
    const unit = a.unit ? units.get(a.unit) : null;
    const person = await prisma.person.upsert({
      where: { email },
      create: { fullName: a.nama, gender: a.gender, email, isActive: true },
      update: { fullName: a.nama, isActive: true },
    });
    await prisma.staff.upsert({
      where: { personId: person.id },
      create: { personId: person.id, employeeNumber: `PEG-DEMO-${String(i + 1).padStart(3, '0')}`, unitId: unit?.id ?? units.get('YAYASAN')?.id, position: a.jabatan, status: 'Aktif' },
      update: { position: a.jabatan },
    });
    const user = await prisma.user.upsert({
      where: { personId: person.id },
      create: { personId: person.id, email, username: a.username, passwordHash, unitScope: a.unit ?? 'Semua unit', aktif: true },
      update: { username: a.username, passwordHash, aktif: true },
    });
    await prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: role.id } }, create: { userId: user.id, roleId: role.id }, update: {} });
    if (unit) {
      await prisma.userUnit.upsert({ where: { userId_unitId: { userId: user.id, unitId: unit.id } }, create: { userId: user.id, unitId: unit.id }, update: {} });
    }
  }
}

type Lok = { code: string; name: string; type: LocationType; parent?: string; unit?: string; roomUsage?: string; areaM2?: number; capacity?: number; pic?: string };
const LOKASI: Lok[] = [
  { code: 'K-NH', name: 'Kampus Nurul Huda Mergosono', type: 'Kampus' },
  { code: 'G-A', name: 'Gedung A (SMP)', type: 'Gedung', parent: 'K-NH', unit: 'SMP' },
  { code: 'G-A.1', name: 'Gedung A Lantai 1', type: 'Lantai', parent: 'G-A', unit: 'SMP' },
  { code: 'G-A.1.01', name: 'Kelas 7A', type: 'Ruang', parent: 'G-A.1', unit: 'SMP', roomUsage: 'Kelas', areaM2: 63, capacity: 32, pic: 'pegawai.1' },
  { code: 'G-A.1.02', name: 'Kantor TU', type: 'Ruang', parent: 'G-A.1', unit: 'SMP', roomUsage: 'Kantor', areaM2: 36, capacity: 8 },
  { code: 'G-B', name: 'Gedung B (MA)', type: 'Gedung', parent: 'K-NH', unit: 'MA' },
  { code: 'G-B.2', name: 'Gedung B Lantai 2', type: 'Lantai', parent: 'G-B', unit: 'MA' },
  { code: 'G-B.2.01', name: 'Lab IPA MA', type: 'Ruang', parent: 'G-B.2', unit: 'MA', roomUsage: 'Lab', areaM2: 72, capacity: 36 },
  { code: 'G-B.2.02', name: 'Kelas 10A', type: 'Ruang', parent: 'G-B.2', unit: 'MA', roomUsage: 'Kelas', areaM2: 63, capacity: 32 },
  { code: 'MSJ', name: "Masjid Jami' Nurul Huda", type: 'Area', parent: 'K-NH', roomUsage: 'Ibadah', areaM2: 400, capacity: 600 },
  { code: 'AULA', name: 'Aula Yayasan', type: 'Ruang', parent: 'K-NH', unit: 'YAYASAN', roomUsage: 'Aula', areaM2: 250, capacity: 300 },
  { code: 'ASR-F', name: 'Asrama Putra Al-Fatih', type: 'Gedung', parent: 'K-NH', unit: 'Pondok' },
  { code: 'ASR-F.01', name: 'Kamar Al-Fatih 1', type: 'Ruang', parent: 'ASR-F', unit: 'Pondok', roomUsage: 'Asrama', areaM2: 30, capacity: 12, pic: 'musyrif.1' },
  { code: 'DPR', name: 'Dapur Umum', type: 'Ruang', parent: 'K-NH', unit: 'Pondok', roomUsage: 'Dapur', areaM2: 80 },
  { code: 'GDG', name: 'Gudang Sarpras', type: 'Ruang', parent: 'K-NH', unit: 'YAYASAN', roomUsage: 'Gudang', areaM2: 40 },
];

type Ast = {
  code: string; name: string; cat: string; unit: string; lok?: string; dana: string; cost: number; date: string; method?: string;
  qty?: number; brand?: string; borrowable?: boolean; holder?: string; donor?: string; condition?: AssetCondition; attributes?: Record<string, string>;
};
const ASET: Ast[] = [
  { code: 'NH/SMP/B.02.03/2024/0001', name: 'Proyektor Epson EB-X500', cat: 'B.02.03', unit: 'SMP', lok: 'G-A.1.01', dana: 'BOS', cost: 6_500_000, date: '2024-07-10', brand: 'Epson', borrowable: true },
  { code: 'NH/SMP/B.01.01/2023/0001', name: 'Meja & kursi siswa (set)', cat: 'B.01.01', unit: 'SMP', lok: 'G-A.1.01', dana: 'BOS', cost: 24_000_000, date: '2023-07-01', qty: 32 },
  { code: 'NH/SMP/B.02.01/2025/0001', name: 'Komputer TU Lenovo', cat: 'B.02.01', unit: 'SMP', lok: 'G-A.1.02', dana: 'BOS', cost: 9_200_000, date: '2025-01-15', brand: 'Lenovo' },
  { code: 'NH/YAYASAN/B.02.01/2025/0001', name: 'Laptop ThinkPad E14', cat: 'B.02.01', unit: 'YAYASAN', dana: 'YAYASAN', cost: 11_000_000, date: '2025-03-01', brand: 'Lenovo', holder: 'pegawai.1', borrowable: false },
  { code: 'NH/MA/B.05.01/2024/0001', name: 'Mikroskop binokuler', cat: 'B.05.01', unit: 'MA', lok: 'G-B.2.01', dana: 'BOSP_MADRASAH', cost: 4_800_000, date: '2024-08-20', qty: 6 },
  { code: 'NH/MA/B.02.03/2025/0001', name: 'Proyektor BenQ MS560', cat: 'B.02.03', unit: 'MA', lok: 'G-B.2.02', dana: 'BOSP_MADRASAH', cost: 5_900_000, date: '2025-02-10', brand: 'BenQ', borrowable: true },
  { code: 'NH/YAYASAN/B.03.02/2022/0001', name: 'Sound system masjid', cat: 'B.03.02', unit: 'YAYASAN', lok: 'MSJ', dana: 'WAKAF', cost: 15_000_000, date: '2022-04-01', method: 'Wakaf', donor: 'H. Abdul Karim', borrowable: true },
  { code: 'NH/YAYASAN/B.07.01/2023/0001', name: 'Karpet masjid', cat: 'B.07.01', unit: 'YAYASAN', lok: 'MSJ', dana: 'DONASI', cost: 22_000_000, date: '2023-03-01', method: 'Donasi', donor: 'Ikatan Alumni Nurul Huda', condition: 'RusakRingan' },
  { code: 'NH/YAYASAN/B.03.03/2021/0001', name: 'Genset 10 kVA', cat: 'B.03.03', unit: 'YAYASAN', lok: 'GDG', dana: 'YAYASAN', cost: 35_000_000, date: '2021-06-01' },
  { code: 'NH/YAYASAN/B.04.01/2020/0001', name: 'Mobil Isuzu Elf antar-jemput', cat: 'B.04.01', unit: 'YAYASAN', lok: 'GDG', dana: 'YAYASAN', cost: 320_000_000, date: '2020-02-01', borrowable: true, attributes: { nopol: 'N 1234 AB', noRangka: 'MHCNKR55HAJ012345', noMesin: '4JJ1-123456' } },
  { code: 'NH/PONDOK/B.01.03/2024/0001', name: 'Ranjang susun + kasur', cat: 'B.01.03', unit: 'Pondok', lok: 'ASR-F.01', dana: 'SWADAYA_WALI', cost: 18_000_000, date: '2024-06-15', qty: 6 },
  { code: 'NH/PONDOK/B.03.04/2022/0001', name: 'Pompa air Shimizu + tandon 2000L', cat: 'B.03.04', unit: 'Pondok', lok: 'DPR', dana: 'YAYASAN', cost: 7_500_000, date: '2022-09-01', condition: 'RusakBerat' },
  { code: 'NH/YAYASAN/A.01/2005/0001', name: 'Tanah wakaf komplek pondok', cat: 'A.01', unit: 'YAYASAN', lok: 'K-NH', dana: 'WAKAF', cost: 0, date: '2005-01-01', method: 'Wakaf', donor: 'Alm. KH. Machfudz', attributes: { luasM2: '4500', noSertifikat: 'W.12/2006', noAIW: 'AIW-045/2005', atasNama: 'Nazhir Yayasan Nurul Huda' } },
];

function tokenDeterministik(prefix: string, code: string) {
  return prefix + createHash('sha256').update(code).digest('base64url').slice(0, 20);
}

export async function seedSarprasDemo(prisma: PrismaClient) {
  const units = new Map((await prisma.unit.findMany()).map((u) => [u.key, u]));
  const kategori = new Map((await prisma.assetCategory.findMany()).map((k) => [k.code, k]));
  const dana = new Map((await prisma.fundingSource.findMany()).map((d) => [d.code, d]));
  const superadmin = await prisma.user.findUnique({ where: { username: 'superadmin' } });
  if (!superadmin || kategori.size === 0) return;
  const staffByUsername = async (username: string) => (await prisma.staff.findFirst({ where: { person: { user: { username } } } }))?.id ?? null;

  const lokasi = new Map<string, number>();
  for (const l of LOKASI) {
    const data = {
      name: l.name, type: l.type, parentId: l.parent ? lokasi.get(l.parent) ?? null : null, unitId: l.unit ? units.get(l.unit)?.id ?? null : null,
      roomUsage: l.roomUsage ?? null, areaM2: l.areaM2 ?? null, capacity: l.capacity ?? null, condition: l.type === 'Ruang' || l.type === 'Area' ? ('Baik' as const) : null,
      picStaffId: l.pic ? await staffByUsername(l.pic) : null,
    };
    const row = await prisma.assetLocation.upsert({ where: { code: l.code }, create: { code: l.code, qrToken: tokenDeterministik('r', l.code), ...data }, update: data });
    lokasi.set(l.code, row.id);
  }

  const asetId = new Map<string, bigint>();
  for (const a of ASET) {
    const k = kategori.get(a.cat)!;
    const data = {
      name: a.name, categoryId: k.id, ownerUnitId: units.get(a.unit)!.id, locationId: a.lok ? lokasi.get(a.lok) ?? null : null,
      holderStaffId: a.holder ? await staffByUsername(a.holder) : null, brand: a.brand ?? null, quantity: a.qty ?? 1,
      unitOfMeasure: a.qty ? 'set' : 'unit', acquisitionDate: new Date(a.date), acquisitionMethod: a.method ?? 'Pembelian',
      acquisitionCost: a.cost, isEstimatedValue: a.cost === 0, fundingSourceId: dana.get(a.dana)!.id, donorName: a.donor ?? null,
      usefulLifeYears: k.usefulLifeYears, condition: a.condition ?? 'Baik', isBorrowable: a.borrowable ?? false,
      attributes: a.attributes ?? undefined, createdBy: superadmin.id,
    };
    const row = await prisma.asset.upsert({ where: { inventoryCode: a.code }, create: { inventoryCode: a.code, qrToken: tokenDeterministik('a', a.code), ...data }, update: {} });
    asetId.set(a.code, row.id);
    const sudahAda = await prisma.assetMovement.count({ where: { assetId: row.id, type: 'Registrasi' } });
    if (!sudahAda) {
      await prisma.assetMovement.create({ data: { assetId: row.id, type: 'Registrasi', toLocationId: data.locationId, toUnitId: data.ownerUnitId, toHolderId: data.holderStaffId, date: data.acquisitionDate, reason: 'Data awal (seed demo)', actorId: superadmin.id } });
    }
  }

  const hari = (n: number) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return d; };
  const tugas = [
    { title: 'Servis genset', asset: 'NH/YAYASAN/B.03.03/2021/0001', intervalDays: 90, due: hari(5), status: 'Terjadwal' },
    { title: 'Pajak kendaraan & STNK', asset: 'NH/YAYASAN/B.04.01/2020/0001', intervalDays: 365, due: hari(20), status: 'Terjadwal' },
    { title: 'Kuras tandon', asset: 'NH/PONDOK/B.03.04/2022/0001', intervalDays: 90, due: hari(-3), status: 'Terlewat' },
  ];
  for (const t of tugas) {
    const assetId = asetId.get(t.asset)!;
    const ada = await prisma.maintenanceTask.findFirst({ where: { assetId, title: t.title } });
    if (!ada) await prisma.maintenanceTask.create({ data: { assetId, title: t.title, intervalDays: t.intervalDays, dueDate: t.due, status: t.status } });
  }

  const pegawai = await prisma.user.findUnique({ where: { username: 'pegawai.1' } });
  if (pegawai && !(await prisma.damageReport.findUnique({ where: { code: 'KRS-2026-0001' } }))) {
    await prisma.damageReport.create({
      data: {
        code: 'KRS-2026-0001', assetId: asetId.get('NH/PONDOK/B.03.04/2022/0001'), locationId: lokasi.get('DPR'), reporterUserId: pegawai.id,
        description: 'Pompa air dapur mati total, tidak ada air untuk masak.', severity: 'Darurat', status: 'Baru',
      },
    });
  }

  const atk = await prisma.consumableItem.findFirst({ where: { name: 'Kertas HVS A4 70gr' } });
  if (!atk) {
    await prisma.consumableItem.createMany({
      data: [
        { name: 'Kertas HVS A4 70gr', unitOfMeasure: 'rim', stock: 12, minStock: 10, unitId: units.get('YAYASAN')?.id, storage: 'Gudang Sarpras' },
        { name: 'Sabun cuci piring 800ml', unitOfMeasure: 'botol', stock: 3, minStock: 6, unitId: units.get('Pondok')?.id, storage: 'Dapur Umum' },
        { name: 'Spidol whiteboard', unitOfMeasure: 'pak', stock: 20, minStock: 5, unitId: units.get('SMP')?.id, storage: 'Kantor TU' },
      ],
    });
  }
}

if (process.argv[1]?.endsWith('seed-sarpras.ts')) {
  const prisma = new PrismaClient();
  (async () => {
    const hash = await bcrypt.hash(process.env.SEED_PASSWORD ?? 'Nuha2026!', 12);
    await seedAkunPeranBaru(prisma, hash);
    await seedSarprasDemo(prisma);
    console.log('Seed sarpras demo + akun peran baru selesai.');
  })().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
}
