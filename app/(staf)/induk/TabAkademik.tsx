import { prisma } from '@/lib/prisma';
import { Badge, Kosong, Tabel } from '@/components';

const formatTgl = (tgl: Date) => tgl.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
const formatHari = (tgl: Date) => tgl.toLocaleDateString('id-ID', { weekday: 'long' });

/** Tab Akademik: presensi 14 hari terakhir + nilai semester berjalan. */
export async function TabAkademik({ santriId }: { santriId: bigint }) {
  const [presensi, nilai] = await Promise.all([
    prisma.attendance.findMany({ where: { studentId: santriId }, orderBy: { date: 'desc' }, take: 14 }),
    prisma.nilai.findMany({ where: { santriId }, include: { mapel: true }, orderBy: { mapel: { nama: 'asc' } } }),
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="alert alert-info">
        <div>
          <b>Integrasi silang</b>
          Baris presensi bertanda &ldquo;dari Poskestren&rdquo; terisi otomatis dari rekam medis — guru tidak perlu menandai ulang.
        </div>
      </div>
      <div>
        <h3 className="card-judul">Presensi 2 pekan terakhir</h3>
        {presensi.length === 0
          ? <Kosong pesan="Belum ada rekam presensi untuk santri ini." />
          : (
            <Tabel kolom={['Tanggal', 'Hari', 'Status', 'Keterangan']}>
              {presensi.map((row) => (
                <tr key={String(row.id)}>
                  <td>{formatTgl(row.date)}</td>
                  <td className="muted">{formatHari(row.date)}</td>
                  <td><Badge status={row.status} /></td>
                  <td className="muted">{row.note ?? '-'}</td>
                </tr>
              ))}
            </Tabel>
          )}
      </div>
      <div>
        <h3 className="card-judul">Nilai semester berjalan</h3>
        {nilai.length === 0
          ? <Kosong pesan="Belum ada nilai yang tercatat untuk santri ini." />
          : (
            <Tabel kolom={['Mata pelajaran', { label: 'Tugas', num: true }, { label: 'UTS', num: true }, { label: 'UAS', num: true }, { label: 'Akhir', num: true }, 'Predikat']}>
              {nilai.map((row) => (
                <tr key={String(row.id)}>
                  <td style={{ fontWeight: 500 }}>{row.mapel.nama}</td>
                  <td className="num">{Number(row.tugas).toFixed(0)}</td>
                  <td className="num">{Number(row.uts).toFixed(0)}</td>
                  <td className="num">{Number(row.uas).toFixed(0)}</td>
                  <td className="num">{Number(row.akhir).toFixed(1)}</td>
                  <td>{row.predikat ? <Badge status={row.predikat} /> : '-'}</td>
                </tr>
              ))}
            </Tabel>
          )}
      </div>
    </div>
  );
}
