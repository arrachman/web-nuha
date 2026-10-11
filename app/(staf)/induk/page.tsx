import Link from 'next/link';
import { requirePage } from '@/lib/access';
import { getUnitAktif } from '@/lib/unit-scope';
import { prisma } from '@/lib/prisma';
import { JudulHalaman, Kosong, type TabDef, bacaHalaman, UKURAN_HALAMAN, Pagination } from '@/components';
import { BarisFilter } from './BarisFilter';
import { DaftarSantri } from './DaftarSantri';
import { PohonLembaga } from './PohonLembaga';
import { bacaFilter, hrefInduk, whereFilter } from './filter';
import { ambilAngkatan, ambilPohon, unitIdsPohon } from './pohon';
import { HeaderSantri } from './HeaderSantri';
import { TabUnit } from './TabUnit';
import { TabBiodata } from './TabBiodata';
import { TabAkademik } from './TabAkademik';
import { TabKepesantrenan } from './TabKepesantrenan';
import { TabKesehatan } from './TabKesehatan';
import { TabKeuangan } from './TabKeuangan';
import { TabWali } from './TabWali';

const TABS: TabDef[] = [
  { key: 'biodata', label: 'Biodata' },
  { key: 'akademik', label: 'Akademik' },
  { key: 'pesantren', label: 'Kepesantrenan' },
  { key: 'kesehatan', label: 'Kesehatan' },
  { key: 'keuangan', label: 'Keuangan' },
  { key: 'wali', label: 'Wali & Keluarga' },
];

/** Data Induk — penjelajah berjenjang (lembaga → tingkat → kelas) + penyaring,
 * lalu master-detail: daftar hasil di kiri, profil lintas modul di kanan.
 * Seluruh keadaan hidup di query (`?unit=&kelas=&status=&jk=&angkatan=&q=&sel=&tab=`)
 * supaya tiap tampilan bisa dibookmark dan dibagikan. */
export default async function IndukPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requirePage('induk');
  const sp = await searchParams;
  const ambil = (k: string) => { const v = sp[k]; return Array.isArray(v) ? v[0] : v; };

  const f = bacaFilter(sp);
  if (f.unitId === undefined && f.alumniUnitId === undefined) {
    const unitAktif = await getUnitAktif(session);
    if (unitAktif != null) f.unitId = unitAktif;
  }
  const tabRaw = ambil('tab');
  const tabAktif = TABS.some((t) => t.key === tabRaw) ? (tabRaw as string) : TABS[0].key;

  // Daftar unit diambil lebih dulu karena syarat "lulusan lembaga mana pun"
  // harus diperiksa per unit — seseorang bisa beralumni di satu lembaga sambil
  // masih aktif di lembaga lain, jadi tidak cukup sekadar "punya riwayat Alumni".
  const unitIds = await unitIdsPohon();
  const where = whereFilter(f, { unitIds });
  const halaman = bacaHalaman(sp);

  const [daftar, total, pohon, angkatan] = await Promise.all([
    prisma.santri.findMany({
      where,
      select: {
        id: true, nis: true, nisn: true, status: true,
        person: { select: { fullName: true } },
        kelas: { select: { nama: true } },
        unit: { select: { nama: true } },
        // Penanda lembaga di daftar dibaca dari `kelasLain`, bukan kolom `unit`:
        // satu santri bisa sekolah di SMP sekaligus mengaji di Madin, dan kolom
        // lama hanya memuat penempatan utama — memakainya akan menyembunyikan
        // lembaga keduanya justru di tampilan "Semua lembaga".
        kelasLain: { select: { unit: { select: { id: true, nama: true } } } },
      },
      orderBy: { person: { fullName: 'asc' } },
      skip: (halaman - 1) * UKURAN_HALAMAN,
      take: UKURAN_HALAMAN,
    }),
    prisma.santri.count({ where }),
    ambilPohon(f),
    ambilAngkatan(),
  ]);

  const totalHalaman = Math.max(1, Math.ceil(total / UKURAN_HALAMAN));

  // Dengan paginasi, santri terpilih bisa berada di halaman lain — jadi ?sel=
  // divalidasi lewat query sendiri (harus lolos `where` yang sama), bukan
  // dicari di `daftar`. Tanpa ini seleksi ikut hilang tiap ganti halaman.
  const selRaw = ambil('sel');
  const selDiminta = selRaw && /^\d+$/.test(selRaw) ? BigInt(selRaw) : undefined;
  const selId = selDiminta !== undefined && await prisma.santri.count({ where: { AND: [where, { id: selDiminta }] } })
    ? selDiminta
    : daftar[0]?.id;

  const sel = selId
    ? await prisma.santri.findUnique({ where: { id: selId }, include: { person: true, unit: true } })
    : null;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <JudulHalaman
          judul="Data Induk Santri & Siswa"
          sub="Telusuri per lembaga, tingkat, dan kelas — lalu buka satu profil yang menyatukan data akademik, kepesantrenan, kesehatan, dan keuangan."
        />
        <Link href="/data/santri" className="btn" style={{ marginTop: 4, whiteSpace: 'nowrap' }}>
          + Tambah siswa
        </Link>
      </div>

      {/* Lembaga naik ke tab paling atas: SMP, MA, dan Madin adalah organisasi
          terpisah, jadi memilih lembaga adalah keputusan pertama — bukan cabang
          pohon yang harus dicari. Pohon di bawah tetap untuk drill-down tingkat/kelas. */}
      <TabUnit pohon={pohon} f={f} />

      <div style={{ marginTop: 12 }}>
        <BarisFilter f={f} angkatan={angkatan} hasil={total} />
      </div>

      <div className={`grid induk-grid${sel ? ' induk-grid--sel' : ''}`} style={{ alignItems: 'start', marginTop: 14 }}>
        <details className="card induk-pohon" style={{ padding: 12 }} open>
          <summary className="label" style={{ marginBottom: 8, paddingLeft: 4, cursor: 'pointer' }}>Tingkat & kelas</summary>
          <PohonLembaga pohon={pohon} f={f} />
        </details>

        <div className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="label" style={{ paddingLeft: 4 }}>Hasil ({total})</div>
          <DaftarSantri daftar={daftar} f={f} selId={selId} tab={tabAktif} halaman={halaman} />
          {totalHalaman > 1 && (
            <Pagination
              halaman={halaman}
              totalHalaman={totalHalaman}
              total={total}
              jumlahBaris={daftar.length}
              ukuranHalaman={UKURAN_HALAMAN}
              buatHref={(p) => hrefInduk(f, {}, { halaman: p })}
            />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          {sel ? (
            <>
              <Link href={hrefInduk(f, {}, { tab: tabAktif, halaman })} className="induk-kembali muted" style={{ alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600 }}>
                ‹ Kembali ke daftar
              </Link>
              <HeaderSantri sel={sel} />
              <nav className="tabbar">
                {TABS.map((t) => (
                  <Link
                    key={t.key}
                    href={hrefInduk(f, {}, { sel: selId!, tab: t.key, halaman })}
                    scroll={false}
                    className={`tab ${t.key === tabAktif ? 'active' : ''}`}
                  >
                    {t.label}
                  </Link>
                ))}
              </nav>
              <div className="card">
                {tabAktif === 'biodata' && <TabBiodata santriId={sel.id} />}
                {tabAktif === 'akademik' && <TabAkademik santriId={sel.id} />}
                {tabAktif === 'pesantren' && <TabKepesantrenan santriId={sel.id} />}
                {tabAktif === 'kesehatan' && <TabKesehatan santriId={sel.id} />}
                {tabAktif === 'keuangan' && <TabKeuangan santriId={sel.id} />}
                {tabAktif === 'wali' && <TabWali santriId={sel.id} />}
              </div>
            </>
          ) : <Kosong pesan="Tidak ada santri pada penyaring ini. Longgarkan filter untuk melihat data." />}
        </div>
      </div>
    </>
  );
}
