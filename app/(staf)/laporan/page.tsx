import { requirePage } from '@/lib/access';
import { rp, JudulHalaman, Kosong, Tabel } from '@/components';
import { ambilRekapLaporan } from './data';

export default async function LaporanPage() {
  const session = await requirePage('laporan');
  const rows = await ambilRekapLaporan();

  return (
    <>
      <JudulHalaman
        judul="Laporan Rekap Bulanan"
        sub="Rekap lintas modul seluruh unit yayasan."
        aksi={
          <a href="/laporan/export" className="btn">
            Ekspor CSV
          </a>
        }
      />
      <div className="card" style={{ marginTop: 16 }}>
        {rows.length === 0 ? (
          <Kosong pesan="Belum ada unit terdaftar." />
        ) : (
          <Tabel kolom={['Unit', { label: 'Populasi', num: true }, 'Kehadiran', 'Catatan capaian', { label: 'Nilai keuangan', num: true }]}>
            {rows.map((row) => (
              <tr key={row.unit}>
                <td style={{ fontWeight: 600 }}>{row.unit}</td>
                <td className="num" style={{ fontWeight: 700 }}>{row.siswa}</td>
                <td>{row.hadir}</td>
                <td>{row.capaian}</td>
                <td className="num" style={{ fontWeight: 700 }}>{rp(row.keuangan)}</td>
              </tr>
            ))}
          </Tabel>
        )}
      </div>
    </>
  );
}
