import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Kosong, Tabel } from '@/components';

const tanggal = (tgl: Date) => tgl.toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short' });

/**
 * Kartu ujian: seluruh sesi satu gelombang. Guru hanya melihat sesi mapel yang
 * diampunya — penyaringnya nama pada jadwal pelajaran, sama seperti "Kelas Saya".
 */
export async function TabJadwal({
  searchParams,
  namaGuru,
}: {
  searchParams: Record<string, string | string[] | undefined>;
  namaGuru: string | null;
}) {
  const ujianSemua = await prisma.ujian.findMany({ include: { unit: true }, orderBy: { mulai: 'desc' } });
  if (ujianSemua.length === 0) return <Kosong pesan="Belum ada gelombang ujian." />;

  const dipilih = Number(searchParams.ujian) || ujianSemua[0].id;

  // Guru dibatasi ke mapel yang diampunya; peran lain melihat seluruh sesi.
  let mapelDiampu: string[] | null = null;
  if (namaGuru) {
    const jadwal = await prisma.jadwalPelajaran.findMany({
      where: { guru: namaGuru }, distinct: ['mapel'], select: { mapel: true },
    });
    mapelDiampu = jadwal.map((j) => j.mapel);
  }

  const sesi = await prisma.jadwalUjian.findMany({
    where: {
      ujianId: dipilih,
      ...(mapelDiampu ? { mapel: { nama: { in: mapelDiampu } } } : {}),
    },
    include: { mapel: true, kelas: { include: { santri: { select: { id: true } } } }, _count: { select: { nilai: true } } },
    orderBy: [{ tgl: 'asc' }, { waktu: 'asc' }],
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {ujianSemua.map((u) => (
          <Link
            key={u.id}
            href={`/ujian?tab=jadwal&ujian=${u.id}`}
            className={u.id === dipilih ? 'btn' : 'btn btn-sekunder'}
          >
            {u.jenis} · {u.unit.nama.startsWith('SMP') ? 'SMP' : 'MA'}
          </Link>
        ))}
      </div>

      <div className="card">
        <h3 className="card-judul">Kartu ujian</h3>
        <p className="card-sub" style={{ marginBottom: 14 }}>
          {mapelDiampu
            ? 'Hanya sesi mata pelajaran yang Anda ampu yang ditampilkan.'
            : 'Seluruh sesi pada gelombang terpilih.'}
        </p>
        {sesi.length === 0 ? (
          <Kosong pesan={mapelDiampu ? 'Tidak ada sesi untuk mapel yang Anda ampu pada gelombang ini.' : 'Gelombang ini belum punya sesi.'} />
        ) : (
          <Tabel kolom={['Tanggal', 'Waktu', 'Mata pelajaran', 'Kelas', 'Ruang', 'Pengawas', { label: 'Dinilai', num: true }]}>
            {sesi.map((s) => (
              <tr key={s.id}>
                <td>{tanggal(s.tgl)}</td>
                <td>{s.waktu}<div className="muted" style={{ fontSize: 11.5 }}>{s.durasi} menit</div></td>
                <td>{s.mapel.nama}</td>
                <td>{s.kelas.nama}</td>
                <td>{s.ruang ?? '-'}</td>
                <td>{s.pengawas ?? <span className="muted">belum ditunjuk</span>}</td>
                <td style={{ textAlign: 'right' }}>
                  {s._count.nilai} / {s.kelas.santri.length}
                </td>
              </tr>
            ))}
          </Tabel>
        )}
      </div>
    </div>
  );
}
