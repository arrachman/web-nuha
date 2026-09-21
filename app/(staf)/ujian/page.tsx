import { requirePage } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { JudulHalaman, StatCard, Tabs, tabAktif } from '@/components';
import { TabGelombang } from './TabGelombang';
import { TabJadwal } from './TabJadwal';
import { TabNilai } from './TabNilai';
import { TabBankSoal } from './TabBankSoal';
import { TabSesiCbt } from './TabSesiCbt';
import { TabPengawasan } from './TabPengawasan';
import { TabKartu } from './TabKartu';

const TABS = [
  { key: 'gelombang', label: 'Gelombang Ujian' },
  { key: 'jadwal', label: 'Jadwal Sesi' },
  { key: 'nilai', label: 'Input Nilai' },
  { key: 'bank', label: 'Bank Soal' },
  { key: 'cbt', label: 'Sesi CBT' },
  { key: 'pengawasan', label: 'Pengawasan' },
  { key: 'kartu', label: 'Kartu Ujian' },
];

/** Peran yang boleh memindahkan status gelombang; guru hanya mengisi nilai. */
const PENGELOLA = ['superadmin', 'ketua', 'kepsmp', 'kepma'];

export default async function UjianPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePage('ujian');
  const sp = await searchParams;
  const aktif = tabAktif(TABS, sp.tab);

  const bolehKelola = session.peran.some((peran) => PENGELOLA.includes(peran));
  // Guru murni disaring ke mapel yang diampunya; pengelola melihat seluruh sesi.
  const namaGuru = !bolehKelola && session.peran.includes('guru') ? session.nama?.trim() || null : null;

  const [gelombang, berjalan, sesi, nilai, soal, sesiCbt, cbtBerjalan, dibekukan] = await Promise.all([
    prisma.ujian.count(),
    prisma.ujian.count({ where: { status: 'Berjalan' } }),
    prisma.jadwalUjian.count(),
    prisma.nilaiUjian.count(),
    prisma.soal.count({ where: { aktif: true } }),
    prisma.sesiCbt.count(),
    prisma.sesiCbt.count({ where: { status: 'Berjalan' } }),
    prisma.pesertaCbt.count({ where: { status: 'Dibekukan' } }),
  ]);

  return (
    <>
      <JudulHalaman
        judul="Manajemen Ujian"
        sub="Gelombang ujian per unit, kartu ujian tiap sesi, dan input nilai oleh guru pengampu."
      />
      {namaGuru && (
        <div className="alert alert-info">
          Anda masuk sebagai <strong>Guru</strong>. Yang tampil hanya sesi mata pelajaran yang Anda ampu; status
          gelombang diatur kepala unit.
        </div>
      )}
      <section className="grid g4">
        <StatCard label="Gelombang ujian" nilai={gelombang} sub={`${berjalan} sedang berjalan`} />
        <StatCard label="Sesi terjadwal" nilai={sesi} warna="#17804A" />
        <StatCard label="Nilai masuk" nilai={nilai} warna="#E8973A" />
        <StatCard label="Butir soal aktif" nilai={soal} sub={`${sesiCbt} sesi CBT`} warna="#5B21B6" />
      </section>
      <section className="grid g4">
        <StatCard label="Sesi CBT berjalan" nilai={cbtBerjalan} sub="peserta dapat masuk" warna="#17804A" />
        <StatCard label="Peserta dibekukan" nilai={dibekukan} sub={dibekukan > 0 ? 'perlu ditinjau pengawas' : 'tidak ada pelanggaran'} warna={dibekukan > 0 ? '#B91C1C' : undefined} />
        <StatCard label="Status Anda" nilai={bolehKelola ? 'Pengelola' : 'Pengampu'} sub={bolehKelola ? 'dapat mengubah status sesi' : 'dapat mengisi nilai sesi'} warna="#E8973A" />
      </section>
      <Tabs tabs={TABS} aktif={aktif} basePath="/ujian" />
      {aktif === 'gelombang' && <TabGelombang bolehKelola={bolehKelola} />}
      {aktif === 'jadwal' && <TabJadwal searchParams={sp} namaGuru={namaGuru} />}
      {aktif === 'nilai' && <TabNilai searchParams={sp} namaGuru={namaGuru} />}
      {aktif === 'bank' && <TabBankSoal namaGuru={namaGuru} />}
      {aktif === 'cbt' && <TabSesiCbt bolehKelola={bolehKelola} />}
      {aktif === 'pengawasan' && <TabPengawasan searchParams={sp} bolehKelola={bolehKelola} />}
      {aktif === 'kartu' && <TabKartu searchParams={sp} />}
    </>
  );
}
