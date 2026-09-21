import { requirePage } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { JudulHalaman, StatCard, Tabs, tabAktif, type TabDef } from '@/components';
import { TabModul } from './TabModul';
import { TabKompetensi } from './TabKompetensi';
import { TabEvidence } from './TabEvidence';
import { TabSertifikat } from './TabSertifikat';
import { TabGamifikasi } from './TabGamifikasi';
import { TabPeringkat } from './TabPeringkat';

const TABS: TabDef[] = [
  { key: 'modul', label: 'Modul' },
  { key: 'kompetensi', label: 'Kompetensi' },
  { key: 'evidence', label: 'Evidence' },
  { key: 'sertifikat', label: 'Sertifikat' },
  { key: 'gamifikasi', label: 'Gamifikasi' },
  { key: 'peringkat', label: 'Peringkat' },
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** KPI puncak modul — ditarik dari kursus & materi LMS, bukan angka tetap. */
async function ambilKartu() {
  const [kursus, materi] = await Promise.all([
    prisma.kursusLms.findMany(),
    prisma.materiLms.findMany(),
  ]);
  const modulTerbit = materi.filter((m) => m.status !== 'Belum dibuka').length;
  const totalElemen = kursus.reduce((total, k) => total + k.modul, 0);
  return {
    modulTerbit,
    modulTotal: materi.length,
    kursusN: kursus.length,
    elemenN: totalElemen,
  };
}

export default async function LmsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requirePage('lms');
  const sp = await searchParams;
  const aktif = tabAktif(TABS, sp.tab);
  const kartu = await ambilKartu();

  return (
    <>
      <JudulHalaman
        judul="LMS, Kompetensi & Gamifikasi"
        sub="Pengelolaan modul pembelajaran, unit kompetensi, evidence, sertifikasi, dan poin santri."
      />

      <section className="grid g4">
        <StatCard label="Materi tersedia" nilai={`${kartu.modulTerbit} / ${kartu.modulTotal}`} />
        <StatCard label="Kursus berjalan" nilai={kartu.kursusN} warna="#17804A" />
        <StatCard label="Total modul kursus" nilai={kartu.elemenN} warna="#E8973A" />
        <StatCard label="Tab aktif" nilai={TABS.find((t) => t.key === aktif)?.label ?? '-'} warna="#5B21B6" />
      </section>

      <Tabs tabs={TABS} aktif={aktif} basePath="/lms" />

      {aktif === 'modul' && <TabModul q={typeof sp.q === 'string' ? sp.q : ''} />}
      {aktif === 'kompetensi' && <TabKompetensi kom={typeof sp.kom === 'string' ? sp.kom : undefined} />}
      {aktif === 'evidence' && <TabEvidence />}
      {aktif === 'sertifikat' && <TabSertifikat />}
      {aktif === 'gamifikasi' && <TabGamifikasi />}
      {aktif === 'peringkat' && <TabPeringkat />}
    </>
  );
}
