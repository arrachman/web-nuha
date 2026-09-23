import { GOLONGAN_KIB } from '@/lib/aset/konstanta';

const LAPORAN = [
  { jenis: 'buku-inventaris', judul: 'Buku Inventaris', isi: 'Seluruh aset per unit & tahun perolehan, termasuk nilai buku hari ini.' },
  { jenis: 'sumber-dana', judul: 'Rekap per sumber dana', isi: 'Jumlah & nilai aset per BOS / BOSP / Yayasan / Wakaf / Hibah.' },
  { jenis: 'kondisi', judul: 'Rekap kondisi', isi: 'Baik / rusak ringan / rusak berat / hilang per unit & per jenis ruang.' },
  { jenis: 'kerusakan', judul: 'Kerusakan & biaya perbaikan', isi: 'Seluruh tiket beserta status, penanganan, dan biaya.' },
  { jenis: 'nilai-buku', judul: 'Nilai buku & penyusutan', isi: 'Penyusutan garis lurus per aset per hari ini.' },
  { jenis: 'wakaf', judul: 'Aset wakaf', isi: 'Aset wakaf + nomor AIW + nazhir + pemberi.' },
  { jenis: 'ruang', judul: 'Data ruang (bahan Dapodik/EMIS)', isi: 'Ruang: jenis, luas, kapasitas, kondisi, jumlah sarana per ruang.' },
  { jenis: 'persediaan', judul: 'Barang habis pakai', isi: 'Stok, stok minimum, dan lokasi gudang.' },
];

/** Laporan & ekspor (04 §7). CSV ber-BOM supaya langsung terbuka rapi di Excel. */
export function TabLaporan() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <section className="grid g3">
        {LAPORAN.map((l) => (
          <div className="card" key={l.jenis}>
            <h3 className="card-judul">{l.judul}</h3>
            <p className="muted" style={{ fontSize: 12.5, minHeight: 36 }}>{l.isi}</p>
            <a className="btn-sekunder" href={`/sarpras/laporan/${l.jenis}`} data-testid={`unduh-${l.jenis}`}>Unduh CSV</a>
          </div>
        ))}
      </section>
      <div className="card">
        <h3 className="card-judul">Kartu Inventaris Barang (KIB)</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(GOLONGAN_KIB).map(([g, n]) => <a key={g} className="btn-sekunder" href={`/sarpras/laporan/kib-${g}`}>KIB {g} — {n}</a>)}
        </div>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
          Kartu Inventaris Ruangan (KIR) siap cetak + QR ruang tersedia di tab Lokasi (tombol &quot;KIR + QR&quot;).
          Ekspor dengan kolom persis templat Dapodik/EMIS menunggu berkas templat resmi dari operator sekolah — sementara pakai &quot;Data ruang&quot;.
        </p>
      </div>
    </div>
  );
}
