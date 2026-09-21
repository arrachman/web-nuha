import { requirePage } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { JudulHalaman, StatCard, rp, Tabs, tabAktif, type TabDef } from '@/components';
import { TabInvoice } from './TabTagihan';
import { TabSpp } from './TabSpp';
import { TabRekap } from './TabRekap';
import { TabTunggakan } from './TabTunggakan';
import { TabTransaksi } from './TabTransaksi';

const TABS: TabDef[] = [
  { key: 'invoices', label: 'Invoice' },
  { key: 'spp', label: 'Riwayat SPP per Anak' },
  { key: 'rekap', label: 'Rekap Nama Santri' },
  { key: 'tunggakan', label: 'Tunggakan' },
  { key: 'transaksi', label: 'Riwayat Transaksi' },
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** KPI ringkas di puncak modul — ditarik dari Invoice + CashTransaction, bukan angka tetap. */
async function ambilKartu() {
  const [totals, kas] = await Promise.all([
    prisma.invoice.aggregate({ _sum: { amount: true, paidAmount: true } }),
    prisma.cashTransaction.groupBy({ by: ['direction'], _sum: { amount: true } }),
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
  const kartu = await ambilKartu();

  return (
    <>
      <JudulHalaman
        judul="Modul Keuangan"
        sub="SPP unit sekolah, syahriyah pondok, uang makan, dan laundry dalam satu tagihan per santri."
      />

      <section className="grid g4">
        <StatCard label="Total tagihan" nilai={rp(kartu.totalInvoice)} />
        <StatCard label="Sudah dibayar" nilai={rp(kartu.totalBayar)} warna="#0F6B3D" />
        <StatCard label="Tunggakan" nilai={rp(kartu.tunggakan)} warna="#B91C1C" />
        <StatCard label="Saldo kas yayasan" nilai={rp(kartu.saldoKas)} warna="#1D4ED8" />
      </section>

      <Tabs tabs={TABS} aktif={aktif} basePath="/keuangan" />

      {aktif === 'invoices' && <TabInvoice q={typeof sp.q === 'string' ? sp.q : ''} />}
      {aktif === 'spp' && <TabSpp anakId={typeof sp.anak === 'string' ? sp.anak : undefined} />}
      {aktif === 'rekap' && <TabRekap q={typeof sp.q === 'string' ? sp.q : ''} />}
      {aktif === 'tunggakan' && <TabTunggakan searchParams={sp} />}
      {aktif === 'transaksi' && <TabTransaksi />}
    </>
  );
}
