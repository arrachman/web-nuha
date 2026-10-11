import { requirePage } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { getUnitAktif } from '@/lib/unit-scope';
import { JudulHalaman, StatCard, rp, Tabs, tabAktif, type TabDef } from '@/components';
import { TabInvoice } from './TabTagihan';
import { TabSpp } from './TabSpp';
import { TabRekap } from './TabRekap';
import { TabTunggakan } from './TabTunggakan';
import { TabTransaksi } from './TabTransaksi';
import { TabSyariah } from './TabSyariah';
import { TabKas } from './TabKas';
import { TabPiutang } from './TabPiutang';
import { TabUtilitas } from './TabUtilitas';
import { TabTriwulan } from './TabTriwulan';
import { PemilihUnitKeuangan } from './PemilihUnitKeuangan';

const TABS: TabDef[] = [
  { key: 'syariah', label: 'Syariah Bulanan' },
  { key: 'kas', label: 'Kas & Pengeluaran' },
  { key: 'piutang', label: 'Piutang' },
  { key: 'utilitas', label: 'Utilitas' },
  { key: 'triwulan', label: 'Triwulan' },
  { key: 'invoices', label: 'Invoice' },
  { key: 'spp', label: 'Riwayat SPP per Anak' },
  { key: 'rekap', label: 'Rekap Nama Santri' },
  { key: 'tunggakan', label: 'Tunggakan' },
  { key: 'transaksi', label: 'Riwayat Transaksi' },
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** KPI ringkas di puncak modul — ditarik dari Invoice + CashTransaction, bukan angka tetap. */
async function ambilKartu(unitAktif: number | null) {
  const [totals, kas] = await Promise.all([
    prisma.invoice.aggregate({ where: unitAktif != null ? { santri: { unitId: unitAktif } } : undefined, _sum: { amount: true, paidAmount: true } }),
    prisma.cashTransaction.groupBy({ by: ['direction'], where: unitAktif != null ? { unitId: unitAktif } : undefined, _sum: { amount: true } }),
  ]);
  const totalInvoice = Number(totals._sum.amount ?? 0);
  const totalBayar = Number(totals._sum.paidAmount ?? 0);
  const masuk = Number(kas.find((k) => k.direction === 'Inbound')?._sum.amount ?? 0);
  const keluar = Number(kas.find((k) => k.direction === 'Outbound')?._sum.amount ?? 0);
  return { totalInvoice, totalBayar, tunggakan: totalInvoice - totalBayar, saldoKas: masuk - keluar };
}

export default async function KeuanganPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requirePage('keuangan');
  const sp = await searchParams;
  const aktif = tabAktif(TABS, sp.tab);
  const now = new Date();
  const periode = typeof sp.periode === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.periode)
    ? sp.periode
    : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const tw = typeof sp.tw === 'string' && /^\d{4}-Q[1-4]$/.test(sp.tw)
    ? sp.tw
    : `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`;
  const unitAktif = await getUnitAktif(session);
  const kartu = await ambilKartu(unitAktif);
  const unitAktifRow = unitAktif != null
    ? await prisma.unit.findUnique({ where: { id: unitAktif }, select: { nama: true } })
    : null;

  return (
    <>
      <JudulHalaman
        judul="Modul Keuangan"
        sub="SPP unit sekolah, syahriyah pondok, uang makan, dan laundry dalam satu tagihan per santri."
      />

      <PemilihUnitKeuangan session={session} />

      <section className="grid g4">
        <StatCard label="Total tagihan" nilai={rp(kartu.totalInvoice)} />
        <StatCard label="Sudah dibayar" nilai={rp(kartu.totalBayar)} warna="#0F6B3D" />
        <StatCard label="Tunggakan" nilai={rp(kartu.tunggakan)} warna="#B91C1C" />
        <StatCard label={unitAktifRow ? `Saldo kas ${unitAktifRow.nama}` : "Saldo kas yayasan (semua unit)"} nilai={rp(kartu.saldoKas)} warna="#1D4ED8" />
      </section>

      <Tabs tabs={TABS} aktif={aktif} basePath="/keuangan" />

      {aktif === 'syariah' && <TabSyariah periode={periode} />}
      {aktif === 'kas' && <TabKas />}
      {aktif === 'piutang' && <TabPiutang />}
      {aktif === 'utilitas' && <TabUtilitas periode={periode} />}
      {aktif === 'triwulan' && <TabTriwulan tw={tw} />}
      {aktif === 'invoices' && <TabInvoice q={typeof sp.q === 'string' ? sp.q : ''} />}
      {aktif === 'spp' && <TabSpp anakId={typeof sp.anak === 'string' ? sp.anak : undefined} />}
      {aktif === 'rekap' && <TabRekap q={typeof sp.q === 'string' ? sp.q : ''} />}
      {aktif === 'tunggakan' && <TabTunggakan searchParams={sp} />}
      {aktif === 'transaksi' && <TabTransaksi />}
    </>
  );
}
