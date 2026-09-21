import { prisma } from '@/lib/prisma';
import { Kosong, ProgressBar, Tabel } from '@/components';
import { analisisPaket, putarToken, terbitkanPeserta, ubahStatusSesi } from './cbt-actions';

const WARNA_STATUS: Record<string, string> = {
  Terjadwal: 'badge-netral',
  Berjalan: 'badge-kuning',
  Selesai: 'badge-hijau',
  Dibatalkan: 'badge-merah',
};

const LANJUT: Record<string, string> = { Terjadwal: 'Berjalan', Berjalan: 'Selesai' };

const jam = (d: Date) => d.toLocaleString('id-ID', {
  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
});

/**
 * Daftar sesi CBT beserta kendali pengawas: buka/tutup sesi, putar token,
 * terbitkan peserta, dan jalankan analisis butir setelah sesi selesai.
 */
export async function TabSesiCbt({ bolehKelola }: { bolehKelola: boolean }) {
  const sesi = await prisma.sesiCbt.findMany({
    include: {
      paket: { select: { id: true, kode: true, nama: true, durasi: true, mapel: { select: { nama: true } } } },
      kelas: { select: { nama: true } },
      peserta: { select: { status: true, pelanggaran: true } },
    },
    orderBy: { mulai: 'desc' },
  });

  if (sesi.length === 0) {
    return <Kosong pesan="Belum ada sesi CBT. Buat paket soal lalu jadwalkan sesinya lewat Master Data." />;
  }

  return (
    <div className="card">
      <h3 className="card-judul">Sesi ujian berbasis komputer</h3>
      <p className="card-sub" style={{ marginBottom: 14 }}>
        Peserta hanya bisa masuk saat sesi berstatus <b>Berjalan</b>, dengan token yang benar dan di dalam
        jendela waktunya. Token, kunci lokasi, dan batas pelanggaran ditegakkan di server.
      </p>
      <Tabel kolom={['Sesi', 'Kelas', 'Waktu', 'Token', 'Proteksi', 'Kemajuan', 'Status', bolehKelola ? 'Tindakan' : '']}>
        {sesi.map((s) => {
          const total = s.peserta.length;
          const selesai = s.peserta.filter((p) => p.status === 'Selesai').length;
          const beku = s.peserta.filter((p) => p.status === 'Dibekukan').length;
          const pct = total > 0 ? Math.round((selesai / total) * 100) : 0;
          const lanjut = LANJUT[s.status];

          return (
            <tr key={s.id}>
              <td>
                <b>{s.paket.nama}</b>
                <div className="muted" style={{ fontSize: 12 }}>
                  {s.paket.mapel.nama} · {s.paket.durasi} menit · {s.kode}
                </div>
              </td>
              <td>{s.kelas.nama}</td>
              <td style={{ whiteSpace: 'nowrap', fontSize: 12.5 }}>
                {jam(s.mulai)}<br />s/d {jam(s.selesai)}
              </td>
              <td><code>{s.status === 'Berjalan' ? s.token : '••••••'}</code></td>
              <td style={{ fontSize: 12 }}>
                {s.ipPrefix && <div>Zona <code>{s.ipPrefix}</code></div>}
                {s.wajibExamBrowser && <div>Exam Browser wajib</div>}
                <div className="muted">Batas {s.batasPelanggaran}× pelanggaran</div>
              </td>
              <td style={{ minWidth: 130 }}>
                <ProgressBar pct={pct} />
                <div className="muted" style={{ fontSize: 12 }}>
                  {selesai}/{total} selesai{beku > 0 ? ` · ${beku} beku` : ''}
                </div>
              </td>
              <td><span className={`badge ${WARNA_STATUS[s.status] ?? 'badge-netral'}`}>{s.status}</span></td>
              {bolehKelola && (
                <td>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {total === 0 && (
                      <form action={terbitkanPeserta}>
                        <input type="hidden" name="sesiId" value={s.id} />
                        <button className="btn btn-sekunder" style={{ fontSize: 12 }}>Terbitkan peserta</button>
                      </form>
                    )}
                    {lanjut && total > 0 && (
                      <form action={ubahStatusSesi}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="status" value={lanjut} />
                        <button className="btn" style={{ fontSize: 12 }}>{lanjut}</button>
                      </form>
                    )}
                    {s.status === 'Berjalan' && (
                      <form action={putarToken}>
                        <input type="hidden" name="id" value={s.id} />
                        <button className="btn btn-sekunder" style={{ fontSize: 12 }}>Putar token</button>
                      </form>
                    )}
                    {s.status === 'Selesai' && (
                      <form action={analisisPaket}>
                        <input type="hidden" name="paketId" value={s.paket.id} />
                        <button className="btn btn-sekunder" style={{ fontSize: 12 }}>Analisis butir</button>
                      </form>
                    )}
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
