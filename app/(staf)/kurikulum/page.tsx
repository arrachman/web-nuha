import { requirePage } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { JudulHalaman, StatCard, Tabs, tabAktif } from '@/components';
import { TabStruktur } from './TabStruktur';
import { TabCp } from './TabCp';
import { TabPerangkat } from './TabPerangkat';
import { TabSoal } from './TabSoal';
import { TabKelas } from './TabKelas';

const TABS = [
  { key: 'struktur', label: 'Struktur Kurikulum' },
  { key: 'cp', label: 'Capaian Pembelajaran' },
  { key: 'perangkat', label: 'Silabus & Modul Ajar' },
  { key: 'soal', label: 'Bank Soal' },
  { key: 'kelas', label: 'Kelas Saya' },
];

export default async function KurikulumPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePage('kurikulum');
  const sp = await searchParams;
  const aktif = tabAktif(TABS, sp.tab);
  const isGuru = session.peran.includes('guru');

  const [mapel, capaian, perangkat, soal] = await Promise.all([
    prisma.mataPelajaran.findMany(),
    prisma.capaianPembelajaran.count(),
    prisma.perangkatAjar.findMany({ select: { status: true } }),
    prisma.bankSoal.findMany({ select: { butir: true } }),
  ]);
  const totalJp = mapel.reduce((total, item) => total + item.jp, 0);
  const paDisetujui = perangkat.filter((item) => item.status === 'Disetujui').length;
  const paReview = perangkat.filter((item) => item.status === 'Menunggu review').length;
  const totalButir = soal.reduce((total, item) => total + item.butir, 0);

  return (
    <>
      <JudulHalaman
        judul="Kurikulum & Perangkat Ajar"
        sub="Struktur kurikulum terpadu, capaian pembelajaran, silabus & modul ajar, bank soal, hingga kelas yang diampu guru."
      />
      {isGuru && (
        <div className="alert alert-info">
          Anda masuk sebagai <strong>Guru / Wali Kelas</strong>. Anda dapat menyusun dan mengajukan perangkat ajar,
          mengelola bank soal, serta menginput nilai & presensi kelas yang diampu. Persetujuan perangkat ajar tetap
          di kepala unit.
        </div>
      )}
      <section className="grid g4">
        <StatCard label="Mata pelajaran" nilai={mapel.length} sub={`${totalJp} JP per pekan`} />
        <StatCard label="Capaian pembelajaran" nilai={capaian} warna="#17804A" />
        <StatCard
          label="Perangkat ajar"
          nilai={`${paDisetujui} / ${perangkat.length}`}
          sub={`${paReview} menunggu review`}
          warna="#E8973A"
        />
        <StatCard label="Bank soal" nilai={totalButir} sub={`butir · ${soal.length} paket`} warna="#5B21B6" />
      </section>
      <Tabs tabs={TABS} aktif={aktif} basePath="/kurikulum" />
      {aktif === 'struktur' && <TabStruktur searchParams={sp} session={session} />}
      {aktif === 'cp' && <TabCp searchParams={sp} />}
      {aktif === 'perangkat' && <TabPerangkat searchParams={sp} />}
      {aktif === 'soal' && <TabSoal searchParams={sp} />}
      {aktif === 'kelas' && <TabKelas session={session} />}
    </>
  );
}
