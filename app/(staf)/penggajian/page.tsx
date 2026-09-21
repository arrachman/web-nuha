import { requirePage } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { JudulHalaman, Tabs, tabAktif } from '@/components';
import { hitungGaji, rupiah } from '@/lib/gaji';
import { TabPayroll } from './TabPayroll';
import { TabSlip } from './TabSlip';
import { TabRekap } from './TabRekap';

const TABS = [
  { key: 'payroll', label: 'Payroll' },
  { key: 'slip', label: 'Slip Gaji' },
  { key: 'rekap', label: 'Rekap' },
];

export const PERIODE_GAJI = () => process.env.NUHA_PERIODE_GAJI ?? new Date().toISOString().slice(0, 7);

export default async function PenggajianPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePage('gaji');
  const sp = await searchParams;
  const aktif = tabAktif(TABS, sp.tab);
  const periode = PERIODE_GAJI();

  const [pegawaiN, komponenSemua] = await Promise.all([
    prisma.staff.count(),
    prisma.staff.findMany({ include: { salaryComponent: true } }),
  ]);
  const total = komponenSemua.reduce(
    (acc, p) => {
      const h = hitungGaji(p.salaryComponent);
      return { bruto: acc.bruto + h.bruto, potongan: acc.potongan + h.potongan, netto: acc.netto + h.netto };
    },
    { bruto: 0, potongan: 0, netto: 0 },
  );

  return (
    <>
      <JudulHalaman
        judul="Penggajian & Slip Gaji"
        sub={`${pegawaiN} pegawai lintas unit — guru, ustadz, musyrif, perawat, tata usaha, dan mitra dokter.`}
      />
      <section className="grid g4">
        <div className="card"><p className="label">Total bruto</p><p className="angka-sm">{rupiah(total.bruto)}</p></div>
        <div className="card"><p className="label">Total potongan</p><p className="angka-sm" style={{ color: '#B91C1C' }}>{rupiah(total.potongan)}</p></div>
        <div className="card"><p className="label">Dibayarkan (netto)</p><p className="angka-sm" style={{ color: '#0F6B3D' }}>{rupiah(total.netto)}</p></div>
        <div className="card"><p className="label">Periode</p><p className="angka-sm" style={{ color: '#E8973A' }}>{periode}</p></div>
      </section>
      <Tabs tabs={TABS} aktif={aktif} basePath="/penggajian" />
      {aktif === 'payroll' && <TabPayroll searchParams={sp} periode={periode} />}
      {aktif === 'slip' && <TabSlip searchParams={sp} periode={periode} />}
      {aktif === 'rekap' && <TabRekap periode={periode} />}
    </>
  );
}
