import { requirePage } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { JudulHalaman, Tabs, tabAktif } from '@/components';
import { TabLowongan } from './TabLowongan';
import { TabPelamar } from './TabPelamar';

const TABS = [
  { key: 'lowongan', label: 'Lowongan' },
  { key: 'pelamar', label: 'Pelamar' },
];

export default async function RekrutmenPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePage('rekrutmen');
  const sp = await searchParams;
  const aktif = tabAktif(TABS, sp.tab);

  const [totalLowonganOpen, totalPelamarAktif, perStatus] = await Promise.all([
    prisma.jobPosting.count({ where: { status: 'Open', deletedAt: null } }),
    prisma.jobApplication.count({ where: { status: { notIn: ['Rejected', 'Withdrawn', 'Hired'] } } }),
    prisma.jobApplication.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);
  const jumlah = (s: string) => perStatus.find((r) => r.status === s)?._count._all ?? 0;

  const STAT = [
    { label: 'Lowongan dibuka', n: totalLowonganOpen, c: '#0A4A2B' },
    { label: 'Lamaran dalam proses', n: totalPelamarAktif, c: '#1E40AF' },
    { label: 'Menunggu seleksi', n: jumlah('Submitted') + jumlah('Screening'), c: '#92400E' },
    { label: 'Diterima', n: jumlah('Hired'), c: '#0F6B3D' },
  ];

  return (
    <>
      <JudulHalaman judul="Rekrutmen" sub="Lowongan kerja, seleksi pelamar, dan konversi jadi pegawai." />
      <section className="grid g4" style={{ marginBottom: 16 }}>
        {STAT.map((s) => (
          <div className="card" key={s.label}>
            <div className="label">{s.label}</div>
            <div className="angka" style={{ color: s.c }}>{s.n}</div>
          </div>
        ))}
      </section>
      <Tabs tabs={TABS} aktif={aktif} basePath="/rekrutmen" />
      {aktif === 'lowongan' && <TabLowongan />}
      {aktif === 'pelamar' && <TabPelamar searchParams={sp} />}
    </>
  );
}
