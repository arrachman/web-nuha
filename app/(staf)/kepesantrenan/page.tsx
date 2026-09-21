import { requirePage } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { JudulHalaman, Tabs, tabAktif } from '@/components';
import { TabAsrama } from './TabAsrama';
import { TabJamaah } from './TabJamaah';
import { TabHafalan } from './TabHafalan';
import { TabHalaqah } from './TabHalaqah';
import { TabTazir } from './TabTazir';
import { TabIzin } from './TabIzin';

const TABS = [
  { key: 'asrama', label: 'Asrama & Kamar' },
  { key: 'jamaah', label: 'Absensi Jamaah' },
  { key: 'hafalan', label: "Hafalan Qur'an" },
  { key: 'halaqah', label: 'Jadwal Halaqah' },
  { key: 'tazir', label: "Buku Ta'zir" },
  { key: 'izin', label: 'Perizinan' },
];

export default async function KepesantrenanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePage('pesantren');
  const sp = await searchParams;
  const aktif = tabAktif(TABS, sp.tab);

  const [santriMukim, asramaCount, kamarCount, halaqahUstadz] = await Promise.all([
    prisma.santri.count({ where: { status: 'Aktif' } }),
    prisma.dormitory.count(),
    prisma.room.count(),
    prisma.studyCircle.findMany({ select: { teacher: true }, distinct: ['teacher'] }),
  ]);

  return (
    <>
      <JudulHalaman
        judul="Modul Kepesantrenan"
        sub={`${santriMukim} santri aktif · ${asramaCount} asrama · ${kamarCount} kamar · ${halaqahUstadz.length} ustadz/ustadzah pengampu halaqah.`}
      />
      <Tabs tabs={TABS} aktif={aktif} basePath="/kepesantrenan" />
      {aktif === 'asrama' && <TabAsrama />}
      {aktif === 'jamaah' && <TabJamaah searchParams={sp} />}
      {aktif === 'hafalan' && <TabHafalan />}
      {aktif === 'halaqah' && <TabHalaqah />}
      {aktif === 'tazir' && <TabTazir />}
      {aktif === 'izin' && <TabIzin />}
    </>
  );
}
