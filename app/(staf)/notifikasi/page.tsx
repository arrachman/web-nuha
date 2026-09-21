import { requirePage } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { JudulHalaman, Tabs, tabAktif } from '@/components';
import { TabLog } from './TabLog';
import { TabTemplate } from './TabTemplate';
import { TabPemicu } from './TabPemicu';
import { TabPerangkat } from './TabPerangkat';

const TABS = [
  { key: 'log', label: 'Log Pengiriman' },
  { key: 'template', label: 'Template' },
  { key: 'pemicu', label: 'Pemicu Otomatis' },
  { key: 'perangkat', label: 'Perangkat' },
];

// Daftar perangkat dan QR datang dari gateway, bukan basis data — jangan pernah
// disajikan dari cache.
export const dynamic = 'force-dynamic';

export default async function NotifikasiPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePage('wa');
  const sp = await searchParams;
  const aktif = tabAktif(TABS, sp.tab);

  const [templates, logN, roles] = await Promise.all([
    prisma.waTemplate.findMany(),
    prisma.waLog.count(),
    prisma.waTemplate.findMany({ select: { role: true }, distinct: ['role'] }),
  ]);
  const aktifN = templates.filter((t) => t.isActive).length;

  return (
    <>
      <JudulHalaman
        judul="Notifikasi WhatsApp"
        sub={`${templates.length} skenario pesan untuk ${roles.length} peran — wali santri, santri, guru, ustadz/musyrif, kiai, staff, kepala sekolah, bendahara.`}
      />
      <section className="grid g4">
        <div className="card"><p className="label">Template</p><p className="angka">{templates.length}</p></div>
        <div className="card"><p className="label">Aktif</p><p className="angka" style={{ color: '#0F6B3D' }}>{aktifN}</p></div>
        <div className="card"><p className="label">Kelompok penerima</p><p className="angka">{roles.length}</p></div>
        <div className="card"><p className="label">Log terkirim</p><p className="angka">{logN}</p></div>
      </section>
      <Tabs tabs={TABS} aktif={aktif} basePath="/notifikasi" />
      {aktif === 'log' && <TabLog searchParams={sp} />}
      {aktif === 'template' && <TabTemplate searchParams={sp} />}
      {aktif === 'pemicu' && <TabPemicu />}
      {aktif === 'perangkat' && <TabPerangkat searchParams={sp} />}
    </>
  );
}
