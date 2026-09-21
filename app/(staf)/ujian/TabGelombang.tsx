import { prisma } from '@/lib/prisma';
import { Kosong, ProgressBar, Tabel } from '@/components';
import { ubahStatusUjian } from './actions';

const WARNA_STATUS: Record<string, string> = { Draf: 'badge-netral', Berjalan: 'badge-kuning', Selesai: 'badge-hijau' };

const tanggal = (tgl: Date) => tgl.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

/** Gelombang ujian per unit, beserta kemajuan penilaiannya. */
export async function TabGelombang({ bolehKelola }: { bolehKelola: boolean }) {
  const ujian = await prisma.ujian.findMany({
    include: {
      unit: true,
      jadwal: { include: { kelas: { include: { santri: { select: { id: true } } } }, _count: { select: { nilai: true } } } },
    },
    orderBy: [{ mulai: 'desc' }],
  });

  if (ujian.length === 0) return <Kosong pesan="Belum ada gelombang ujian. Tambahkan lewat Master Data." />;

  return (
    <div className="card">
      <h3 className="card-judul">Gelombang ujian</h3>
      <p className="card-sub" style={{ marginBottom: 14 }}>
        Kemajuan dihitung dari nilai yang sudah masuk dibanding jumlah peserta seluruh sesi.
      </p>
      <Tabel kolom={['Gelombang', 'Unit', 'Periode', 'Sesi', 'Kemajuan', 'Status', bolehKelola ? 'Tindakan' : '']}>
        {ujian.map((u) => {
          const peserta = u.jadwal.reduce((total, j) => total + j.kelas.santri.length, 0);
          const dinilai = u.jadwal.reduce((total, j) => total + j._count.nilai, 0);
          const pct = peserta === 0 ? 0 : Math.round((dinilai / peserta) * 100);

          return (
            <tr key={u.id}>
              <td>
                <div style={{ fontWeight: 600 }}>{u.nama}</div>
                <div className="muted" style={{ fontSize: 11.5 }}>{u.kode} · {u.jenis}</div>
              </td>
              <td>{u.unit.nama}</td>
              <td>
                <div>{tanggal(u.mulai)} – {tanggal(u.selesai)}</div>
                <div className="muted" style={{ fontSize: 11.5 }}>{u.tahunAjaran} · {u.semester}</div>
              </td>
              <td>{u.jadwal.length}</td>
              <td style={{ minWidth: 140 }}>
                <div className="muted" style={{ fontSize: 11.5, marginBottom: 4 }}>{dinilai} / {peserta} nilai</div>
                <ProgressBar pct={pct} />
              </td>
              <td><span className={`badge ${WARNA_STATUS[u.status] ?? 'badge-netral'}`}>{u.status}</span></td>
              {bolehKelola && (
                <td>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {u.status !== 'Berjalan' && <TombolStatus id={u.id} status="Berjalan" label="Jalankan" />}
                    {u.status !== 'Selesai' && <TombolStatus id={u.id} status="Selesai" label="Tutup" />}
                    {u.status !== 'Draf' && <TombolStatus id={u.id} status="Draf" label="Kembalikan ke draf" />}
                  </div>
                </td>
              )}
            </tr>
          );
        })}
      </Tabel>
    </div>
  );
}

function TombolStatus({ id, status, label }: { id: number; status: string; label: string }) {
  return (
    <form action={ubahStatusUjian}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className="btn btn-sekunder" type="submit">{label}</button>
    </form>
  );
}
