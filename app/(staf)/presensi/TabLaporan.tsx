import type { SessionPayload } from '@/lib/auth';
import { tanggalWib } from '@/lib/presensi/inti';
import { satu, type SearchParams } from '@/components';

/** Ekspor rekap bulanan (02 §4.5) — CSV siap Excel; tidak dipakai otomatis untuk potongan gaji (06 P9). */
export function TabLaporan({ sp }: { session: SessionPayload; sp: SearchParams }) {
  const bulan = /^\d{4}-\d{2}$/.test(satu(sp.bulan)) ? satu(sp.bulan) : tanggalWib().slice(0, 7);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <form method="get" className="card" style={{ display: 'flex', gap: 10, alignItems: 'end' }}>
        <input type="hidden" name="tab" value="laporan" />
        <div className="field" style={{ marginBottom: 0 }}><label>Bulan</label><input type="month" name="bulan" defaultValue={bulan} /></div>
        <button type="submit" className="btn-sekunder">Pilih</button>
      </form>
      <section className="grid g2">
        <div className="card">
          <h3 className="card-judul">Rekap santri per rombel</h3>
          <p className="muted" style={{ fontSize: 12.5 }}>Per santri: jumlah Hadir, Terlambat, Sakit, Izin, Alpa, dan % kehadiran bulan {bulan}. Guru hanya mendapat rombelnya sendiri.</p>
          <a className="btn-sekunder" href={`/presensi/ekspor/rekap-santri?bulan=${bulan}`} data-testid="unduh-rekap-santri">Unduh CSV</a>
        </div>
        <div className="card">
          <h3 className="card-judul">Rekap guru & pegawai</h3>
          <p className="muted" style={{ fontSize: 12.5 }}>Per pegawai: hari hadir, terlambat (kali & total menit), pulang cepat, izin/sakit, alpa, luar lokasi — bahan laporan, bukan potongan gaji otomatis.</p>
          <a className="btn-sekunder" href={`/presensi/ekspor/rekap-pegawai?bulan=${bulan}`} data-testid="unduh-rekap-pegawai">Unduh CSV</a>
        </div>
      </section>
    </div>
  );
}
