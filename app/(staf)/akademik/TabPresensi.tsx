import { prisma } from '@/lib/prisma';
import { ProgressBar, Kosong, type SearchParams } from '@/components';
import { bacaFilter, whereFilter } from './filter';

type Rekap = { kelas: string; hadir: number; sakit: number; izin: number; alpa: number; total: number };

export async function TabPresensi({ searchParams }: { searchParams: SearchParams }) {
  const f = bacaFilter(searchParams);
  const awalBulan = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const namaBulan = awalBulan.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  // Rekap mengikuti penjelajah & penyaring yang sama dengan tab Siswa,
  // supaya "SMP › 7 › 7A" berarti hal yang sama di seluruh modul.
  const presensi = await prisma.attendance.findMany({
    where: { date: { gte: awalBulan }, student: whereFilter(f) },
    include: { student: { include: { kelas: true, unit: true } } },
  });

  const perKelas = new Map<string, Rekap>();
  for (const p of presensi) {
    const unit = p.student.unit?.nama ?? p.student.kelas?.nama ?? '';
    const nama = p.student.kelas ? `${unit ? `${unit} · ` : ''}${p.student.kelas.nama}` : 'Tanpa kelas';
    const rekap = perKelas.get(nama) ?? { kelas: nama, hadir: 0, sakit: 0, izin: 0, alpa: 0, total: 0 };
    rekap.total += 1;
    if (p.status === 'Present') rekap.hadir += 1;
    else if (p.status === 'Sick') rekap.sakit += 1;
    else if (p.status === 'Excused') rekap.izin += 1;
    else if (p.status === 'Absent') rekap.alpa += 1;
    perKelas.set(nama, rekap);
  }
  const rekapPresensi = [...perKelas.values()].sort((a, b) => a.kelas.localeCompare(b.kelas, 'id'));

  return (
    <div className="card">
      <h3 className="card-judul">Rekap presensi per rombel — {namaBulan}</h3>
        <p className="card-sub">Status &quot;Sakit&quot; yang bersumber dari Poskestren sudah terhitung otomatis.</p>
        {rekapPresensi.length === 0 && <Kosong pesan="Belum ada catatan presensi bulan ini untuk penyaring yang dipilih." />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 14 }}>
          {rekapPresensi.map((r) => {
            const pct = r.total === 0 ? 0 : (r.hadir / r.total) * 100;
            return (
              <div key={r.kelas} style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ width: 168, fontSize: 13, fontWeight: 600 }}>{r.kelas}</div>
                <div style={{ flex: 1, minWidth: 160 }}><ProgressBar pct={pct} /></div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--hijau-gelap)', width: 48 }}>{Math.round(pct)}%</div>
                <div className="muted" style={{ fontSize: 12, width: 190 }}>Sakit {r.sakit} · Izin {r.izin} · Alpa {r.alpa}</div>
              </div>
            );
          })}
        </div>
    </div>
  );
}
