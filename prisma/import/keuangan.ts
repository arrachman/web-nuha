/**
 * Importir CSV keuangan: invoices SPP, payments, komponen gaji, transaksi
 * kas. Dijalankan lewat `npm run import:keuangan -- --invoices <path>
 * --payments <path> --gaji <path> --kas <path>` (semua flag opsional,
 * hanya berkas yang diberikan yang diproses).
 *
 * Prinsip:
 * - Validasi SELURUH baris dari SELURUH berkas dulu, kumpulkan semua galat.
 *   Kalau ada satu saja galat, TIDAK ADA yang ditulis ke DB dan proses
 *   keluar dengan exit code 1.
 * - Idempoten: upsert berbasis code unik (Invoice.code, CashTransaction.code)
 *   atau kombinasi invoices+date+amount+reference untuk Payment.
 * - `Invoice.paidAmount` selalu dihitung ulang dari SUM(Payment), kolom
 *   `paidAmount` di CSV invoices hanya dipakai sebagai nilai awal saat insert.
 */
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { parseCsv } from './lib/csv';
import { keAngka, keTanggal, keArahKas } from './lib/nilai';
import { readFileSync } from 'node:fs';

type Galat = { berkas: string; baris: number; pesan: string };

const AKTOR_SKRIP = { nama: 'Importir CSV (skrip)' };

/** Baca argumen CLI berbentuk `--nama nilai`. */
const bacaArgumen = (argv: string[]): Record<string, string> => {
  const hasil: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      const kunci = argv[i].slice(2);
      hasil[kunci] = argv[i + 1] ?? '';
      i += 1;
    }
  }
  return hasil;
};

const bacaCsv = (path: string): Record<string, string>[] => parseCsv(readFileSync(path, 'utf-8'));

const HEADER_TAGIHAN = ['kode', 'nisn', 'nama_santri', 'jenis', 'periode', 'nominal', 'dibayar', 'jatuh_tempo'];
const HEADER_PEMBAYARAN = ['kode_tagihan', 'tgl', 'nominal', 'metode', 'ref'];
const HEADER_GAJI = ['nip', 'nama_pegawai', 'unit', 'pokok', 'tunj_jab', 'tunj_kel', 'jam_mengajar', 'tarif_jam', 'transport', 'bpjs', 'koperasi', 'pph', 'rekening'];
const HEADER_KAS = ['kode', 'tgl', 'uraian', 'kategori', 'metode', 'arah', 'nominal'];

const validasiHeader = (baris: Record<string, string>[], header: string[], berkas: string, galat: Galat[]): void => {
  if (baris.length === 0) return;
  const kolomAda = new Set(Object.keys(baris[0]));
  const kurang = header.filter((kolom) => !kolomAda.has(kolom));
  if (kurang.length > 0) {
    galat.push({ berkas, baris: 0, pesan: `header kurang kolom: ${kurang.join(', ')}` });
  }
};

type SiapInvoice = { code: string; nisnClean: string; santriId: bigint; type: string; period: string; amount: number; dibayarAwal: number; dueDate: Date };

/** Validasi + siapkan baris invoices. Mengumpulkan galat, tidak melempar. */
async function siapkanInvoice(baris: Record<string, string>[], berkas: string, galat: Galat[]): Promise<SiapInvoice[]> {
  validasiHeader(baris, HEADER_TAGIHAN, berkas, galat);
  const hasil: SiapInvoice[] = [];
  const kodeTerlihat = new Set<string>();

  for (const [idx, row] of baris.entries()) {
    const noBaris = idx + 2; // +1 header, +1 basis-1
    try {
      const code = row.kode?.trim();
      if (!code) throw new Error('kode tagihan kosong');
      if (kodeTerlihat.has(code)) throw new Error(`code "${code}" duplikat di dalam berkas`);
      kodeTerlihat.add(code);

      const nisn = row.nisn?.trim();
      if (!nisn) throw new Error('nisn kosong');
      const santri = await prisma.santri.findUnique({ where: { nisn }, select: { id: true } });
      if (!santri) throw new Error(`nisn "${nisn}" tidak ditemukan di data santri`);

      const type = row.jenis?.trim();
      if (!type) throw new Error('jenis tagihan kosong');
      const period = row.periode?.trim();
      if (!period) throw new Error('periode kosong');

      const amount = keAngka(row.nominal, 'nominal');
      const dibayarAwal = keAngka(row.dibayar, 'dibayar');
      const dueDate = keTanggal(row.jatuh_tempo, 'jatuh_tempo');

      hasil.push({ code, nisnClean: nisn, santriId: santri.id, type, period, amount, dibayarAwal, dueDate });
    } catch (error) {
      galat.push({ berkas, baris: noBaris, pesan: error instanceof Error ? error.message : String(error) });
    }
  }
  return hasil;
}

type SiapPayment = { kodeInvoice: string; date: Date; amount: number; method: string; reference: string | null };

async function siapkanPayment(baris: Record<string, string>[], berkas: string, galat: Galat[], kodeInvoiceValid: Set<string>): Promise<SiapPayment[]> {
  validasiHeader(baris, HEADER_PEMBAYARAN, berkas, galat);
  const hasil: SiapPayment[] = [];

  for (const [idx, row] of baris.entries()) {
    const noBaris = idx + 2;
    try {
      const kodeInvoice = row.kode_tagihan?.trim();
      if (!kodeInvoice) throw new Error('kode_tagihan kosong');

      const tersediaDiDb = kodeInvoiceValid.has(kodeInvoice)
        || (await prisma.invoice.findUnique({ where: { code: kodeInvoice }, select: { id: true } })) !== null;
      if (!tersediaDiDb) throw new Error(`kode_tagihan "${kodeInvoice}" tidak ditemukan (tidak ada di DB maupun berkas invoices yang diimpor bersamaan)`);

      const date = keTanggal(row.tgl, 'tgl');
      const amount = keAngka(row.nominal, 'nominal');
      const method = row.metode?.trim();
      if (!method) throw new Error('metode kosong');
      const reference = row.ref?.trim() || null;

      hasil.push({ kodeInvoice, date, amount, method, reference });
    } catch (error) {
      galat.push({ berkas, baris: noBaris, pesan: error instanceof Error ? error.message : String(error) });
    }
  }
  return hasil;
}

type SiapGaji = {
  pegawaiId: bigint; nip: string; baseSalary: number; positionAllowance: number; familyAllowance: number;
  teachingHours: number; hourlyRate: number; transport: number; bpjs: number; cooperative: number; incomeTax: number;
};

async function siapkanGaji(baris: Record<string, string>[], berkas: string, galat: Galat[]): Promise<SiapGaji[]> {
  validasiHeader(baris, HEADER_GAJI, berkas, galat);
  const hasil: SiapGaji[] = [];
  const nipTerlihat = new Set<string>();

  for (const [idx, row] of baris.entries()) {
    const noBaris = idx + 2;
    try {
      const nip = row.nip?.trim();
      if (!nip) throw new Error('nip kosong');
      if (nipTerlihat.has(nip)) throw new Error(`nip "${nip}" duplikat di dalam berkas`);
      nipTerlihat.add(nip);

      const pegawai = await prisma.staff.findUnique({ where: { employeeNumber: nip }, select: { id: true } });
      if (!pegawai) throw new Error(`nip "${nip}" tidak ditemukan di data pegawai`);

      const baseSalary = keAngka(row.pokok, 'pokok');
      const positionAllowance = keAngka(row.tunj_jab, 'tunj_jab');
      const familyAllowance = keAngka(row.tunj_kel, 'tunj_kel');
      const teachingHours = keAngka(row.jam_mengajar, 'jam_mengajar');
      const hourlyRate = keAngka(row.tarif_jam, 'tarif_jam');
      const transport = keAngka(row.transport, 'transport');
      const bpjs = keAngka(row.bpjs, 'bpjs');
      const cooperative = keAngka(row.koperasi, 'koperasi');
      const incomeTax = keAngka(row.pph, 'pph');

      hasil.push({ pegawaiId: pegawai.id, nip, baseSalary, positionAllowance, familyAllowance, teachingHours, hourlyRate, transport, bpjs, cooperative, incomeTax });
    } catch (error) {
      galat.push({ berkas, baris: noBaris, pesan: error instanceof Error ? error.message : String(error) });
    }
  }
  return hasil;
}

type SiapKas = { code: string; date: Date; description: string; category: string; method: string; direction: 'Inbound' | 'Outbound'; amount: number };

async function siapkanKas(baris: Record<string, string>[], berkas: string, galat: Galat[]): Promise<SiapKas[]> {
  validasiHeader(baris, HEADER_KAS, berkas, galat);
  const hasil: SiapKas[] = [];
  const kodeTerlihat = new Set<string>();

  for (const [idx, row] of baris.entries()) {
    const noBaris = idx + 2;
    try {
      const code = row.kode?.trim();
      if (!code) throw new Error('kode kas kosong');
      if (kodeTerlihat.has(code)) throw new Error(`kode "${code}" duplikat di dalam berkas`);
      kodeTerlihat.add(code);

      const date = keTanggal(row.tgl, 'tgl');
      const description = row.uraian?.trim();
      if (!description) throw new Error('uraian kosong');
      const category = row.kategori?.trim();
      if (!category) throw new Error('kategori kosong');
      const method = row.metode?.trim();
      if (!method) throw new Error('metode kosong');
      const direction: 'Inbound' | 'Outbound' = keArahKas(row.arah, 'arah') === 'Masuk' ? 'Inbound' : 'Outbound';
      const amount = keAngka(row.nominal, 'nominal');

      hasil.push({ code, date, description, category, method, direction, amount });
    } catch (error) {
      galat.push({ berkas, baris: noBaris, pesan: error instanceof Error ? error.message : String(error) });
    }
  }
  return hasil;
}

async function tulisAudit(aksi: string, entitas: string, entitasId: string, ringkasan: string): Promise<void> {
  // Skrip CLI tidak punya aktor sesi asli; recordAudit menerima aktor
  // opsional jadi kita pakai label generik agar tetap tercatat di audit log.
  await recordAudit({ aksi, entitas, entitasId, ringkasan, aktor: AKTOR_SKRIP });
}

async function jalankan(): Promise<void> {
  const argumen = bacaArgumen(process.argv.slice(2));
  const galat: Galat[] = [];

  const pathInvoice = argumen.invoices;
  const pathPayment = argumen.payments;
  const pathGaji = argumen.gaji;
  const pathKas = argumen.kas;

  if (!pathInvoice && !pathPayment && !pathGaji && !pathKas) {
    console.error('Tidak ada berkas diberikan. Pakai --invoices/--payments/--gaji/--kas <path>.');
    process.exitCode = 1;
    return;
  }

  const dataInvoice = pathInvoice ? bacaCsv(pathInvoice) : [];
  const dataPayment = pathPayment ? bacaCsv(pathPayment) : [];
  const dataGaji = pathGaji ? bacaCsv(pathGaji) : [];
  const dataKas = pathKas ? bacaCsv(pathKas) : [];

  const siapInvoice = pathInvoice ? await siapkanInvoice(dataInvoice, pathInvoice, galat) : [];
  const kodeInvoiceValid = new Set(siapInvoice.map((t) => t.code));
  const siapPayment = pathPayment ? await siapkanPayment(dataPayment, pathPayment, galat, kodeInvoiceValid) : [];
  const siapGaji = pathGaji ? await siapkanGaji(dataGaji, pathGaji, galat) : [];
  const siapKas = pathKas ? await siapkanKas(dataKas, pathKas, galat) : [];

  // Duplikat code invoices lintas file tidak relevan; tapi duplikat code
  // invoices vs code kas (beda tabel) tidak masalah karena unique per model.

  if (galat.length > 0) {
    console.error(`Ditemukan ${galat.length} galat validasi. Tidak ada data yang ditulis ke DB.\n`);
    for (const g of galat) {
      const lokasi = g.baris > 0 ? `${g.berkas}:${g.baris}` : g.berkas;
      console.error(`  - [${lokasi}] ${g.pesan}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('Validasi lolos. Menulis ke database...');

  const tagihanIdByKode = new Map<string, bigint>();
  for (const t of siapInvoice) {
    const invoices = await prisma.invoice.upsert({
      where: { code: t.code },
      create: {
        code: t.code,
        santriId: t.santriId,
        type: t.type,
        period: t.period,
        amount: t.amount,
        paidAmount: t.dibayarAwal,
        dueDate: t.dueDate,
      },
      update: {
        santriId: t.santriId,
        type: t.type,
        period: t.period,
        amount: t.amount,
        dueDate: t.dueDate,
      },
    });
    tagihanIdByKode.set(t.code, invoices.id);
  }
  if (siapInvoice.length > 0) {
    console.log(`Invoice: ${siapInvoice.length} baris di-upsert.`);
    await tulisAudit('import', 'Invoice', 'batch', `Impor CSV: ${siapInvoice.length} invoices (${pathInvoice}).`);
  }

  const tagihanTerdampak = new Set<bigint>();
  for (const p of siapPayment) {
    const invoiceId = tagihanIdByKode.get(p.kodeInvoice)
      ?? (await prisma.invoice.findUniqueOrThrow({ where: { code: p.kodeInvoice }, select: { id: true } })).id;

    // Idempoten: kombinasi invoices+date+amount+method+reference dianggap identitas
    // payments karena tabel ini tidak punya kolom code unik sendiri.
    const existing = await prisma.payment.findFirst({
      where: { invoiceId, date: p.date, amount: p.amount, method: p.method, reference: p.reference },
      select: { id: true },
    });
    if (!existing) {
      await prisma.payment.create({
        data: { invoiceId, date: p.date, amount: p.amount, method: p.method, reference: p.reference },
      });
    }
    tagihanTerdampak.add(invoiceId);
  }

  for (const invoiceId of tagihanTerdampak) {
    const agregat = await prisma.payment.aggregate({ where: { invoiceId }, _sum: { amount: true } });
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { paidAmount: agregat._sum.amount ?? 0 },
    });
  }
  if (siapPayment.length > 0) {
    console.log(`Payment: ${siapPayment.length} baris diproses, ${tagihanTerdampak.size} invoices dihitung ulang.`);
    await tulisAudit('import', 'Payment', 'batch', `Impor CSV: ${siapPayment.length} payments (${pathPayment}), ${tagihanTerdampak.size} invoices dihitung ulang.`);
  }

  for (const g of siapGaji) {
    await prisma.salaryComponent.upsert({
      where: { staffId: g.pegawaiId },
      create: {
        staffId: g.pegawaiId,
        baseSalary: g.baseSalary,
        positionAllowance: g.positionAllowance,
        familyAllowance: g.familyAllowance,
        teachingHours: g.teachingHours,
        hourlyRate: g.hourlyRate,
        transport: g.transport,
        bpjs: g.bpjs,
        cooperative: g.cooperative,
        incomeTax: g.incomeTax,
      },
      update: {
        baseSalary: g.baseSalary,
        positionAllowance: g.positionAllowance,
        familyAllowance: g.familyAllowance,
        teachingHours: g.teachingHours,
        hourlyRate: g.hourlyRate,
        transport: g.transport,
        bpjs: g.bpjs,
        cooperative: g.cooperative,
        incomeTax: g.incomeTax,
      },
    });
  }
  if (siapGaji.length > 0) {
    console.log(`SalaryComponent: ${siapGaji.length} baris di-upsert.`);
    await tulisAudit('import', 'SalaryComponent', 'batch', `Impor CSV: ${siapGaji.length} komponen gaji (${pathGaji}).`);
  }

  for (const k of siapKas) {
    await prisma.cashTransaction.upsert({
      where: { code: k.code },
      create: { code: k.code, date: k.date, description: k.description, category: k.category, method: k.method, direction: k.direction, amount: k.amount },
      update: { date: k.date, description: k.description, category: k.category, method: k.method, direction: k.direction, amount: k.amount },
    });
  }
  if (siapKas.length > 0) {
    console.log(`CashTransaction: ${siapKas.length} baris di-upsert.`);
    await tulisAudit('import', 'CashTransaction', 'batch', `Impor CSV: ${siapKas.length} transaksi kas (${pathKas}).`);
  }

  console.log('Selesai.');
}

jalankan()
  .catch((error) => {
    console.error('Galat tak terduga saat impor:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
