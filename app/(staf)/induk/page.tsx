import Link from 'next/link';
import { requirePage } from '@/lib/access';
import { getUnitAktif } from '@/lib/unit-scope';
import { prisma } from '@/lib/prisma';
import { JudulHalaman, bacaHalaman, UKURAN_HALAMAN, Pagination } from '@/components';
import { BarisFilter } from './BarisFilter';
import { DaftarSantri } from './DaftarSantri';
import { bacaFilter, hrefInduk, whereFilter } from './filter';
import { ambilAngkatan, ambilPohon, unitIdsPohon } from './pohon';
import { TabUnit } from './TabUnit';

/** Data Induk — halaman ini HANYA daftar: penjelajah berjenjang (lembaga →
 * tingkat → kelas) + penyaring + hasil berpaginasi. Profil santri bukan lagi
 * panel di halaman ini; ia halaman tersendiri di /induk/[id] supaya daftar
 * selalu tampil penuh dan tautan profil bisa dibagikan langsung. Keadaan
 * daftar hidup di query (`?unit=&kelas=&status=&jk=&angkatan=&q=&halaman=`)
 * dan ikut terbawa ke tautan profil, agar tombol kembali dari halaman
 * profil mendarat di daftar yang sama persis. */
export default async function IndukPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requirePage('induk');
  const sp = await searchParams;

  const f = bacaFilter(sp);
  // Filter unit global (PemilihUnit di topbar) dibaca selalu, bukan hanya saat
  // URL belum memilih unit: keberadaannya menentukan apakah tab lembaga di
  // bawah masih perlu tampil (lihat render TabUnit).
  const unitAktif = await getUnitAktif(session);
  if (f.unitId === undefined && f.alumniUnitId === undefined && unitAktif != null) {
    f.unitId = unitAktif;
  }

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

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <JudulHalaman
          judul="Data Induk Santri & Siswa"
          sub="Telusuri per lembaga, tingkat, dan kelas — klik satu nama untuk membuka profil lengkapnya di halaman tersendiri."
        />
        <Link href="/data/santri" className="btn" style={{ marginTop: 4, whiteSpace: 'nowrap' }}>
          + Tambah siswa
        </Link>
      </div>

      {/* Lembaga naik ke tab paling atas: SMP, MA, dan Madin adalah organisasi
          terpisah, jadi memilih lembaga adalah keputusan pertama — bukan cabang
          pohon yang harus dicari. Drill-down tingkat/kelas hidup sebagai
          dropdown Kelas di BarisFilter (panel pohon sudah dihapus).
          Bila filter unit global (PemilihUnit) sedang aktif, tab ini dihapus total:
          konteks lembaga sudah dikunci topbar, menampilkannya lagi hanya membuat
          dua kontrol yang mengerjakan hal sama (dan klik "Semua lembaga" di sini
          akan langsung ke-lock lagi oleh cookie). */}
      {unitAktif == null && <TabUnit pohon={pohon} f={f} />}

      <div style={{ marginTop: 12 }}>
        <BarisFilter f={f} angkatan={angkatan} hasil={total} pohon={pohon} />
      </div>

      <div className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
        <div className="label" style={{ paddingLeft: 4 }}>Hasil ({total})</div>
        <DaftarSantri daftar={daftar} f={f} halaman={halaman} />
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
    </>
  );
}
