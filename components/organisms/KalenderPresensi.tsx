import { prisma } from '@/lib/prisma';

const WARNA: Record<string, string> = { Present: '#0F6B3D', Late: '#7C3AED', Sick: '#1D4ED8', Excused: '#B45309', Absent: '#B91C1C', EarlyDeparture: '#6B7280' };
const LABEL: Record<string, string> = { Present: 'Hadir', Late: 'Terlambat', Sick: 'Sakit', Excused: 'Izin', Absent: 'Alpa' };
const URUTAN = ['Absent', 'Sick', 'Excused', 'Late', 'Present'];

/**
 * Kalender presensi bulanan berwarna untuk portal wali & santri (02 §4.5).
 * Satu kotak per hari; warna = status "terburuk" hari itu di semua sesi.
 */
export async function KalenderPresensi({ santriId, bulan }: { santriId: bigint; bulan?: string }) {
  const kini = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 7);
  const b = bulan && /^\d{4}-\d{2}$/.test(bulan) ? bulan : kini;
  const [th, bl] = b.split('-').map(Number);
  const awal = new Date(Date.UTC(th, bl - 1, 1));
  const akhir = new Date(Date.UTC(th, bl, 0));
  const rows = await prisma.attendance.findMany({ where: { studentId: santriId, date: { gte: awal, lte: akhir } }, orderBy: { date: 'asc' } });
  const perHari = new Map<number, typeof rows>();
  for (const r of rows) perHari.set(r.date.getUTCDate(), [...(perHari.get(r.date.getUTCDate()) ?? []), r]);
  const offset = (awal.getUTCDay() + 6) % 7; // Senin = kolom pertama
  const jumlah = (st: string) => rows.filter((r) => r.status === st).length;
  const kotak = { background: '#FFFFFF', border: '1px solid #E8E3D9', borderRadius: 14, padding: 16 } as const;

  return (
    <div style={kotak} data-testid="kalender-presensi">
      <div style={{ fontSize: 13, fontWeight: 700, color: '#0A4A2B', marginBottom: 10 }}>
        Presensi {awal.toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, fontSize: 11 }}>
        {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Ahd'].map((h) => <div key={h} style={{ textAlign: 'center', color: '#6B7280', fontWeight: 700 }}>{h}</div>)}
        {Array.from({ length: offset }, (_, i) => <div key={`k${i}`} />)}
        {Array.from({ length: akhir.getUTCDate() }, (_, i) => {
          const tgl = i + 1;
          const hari = perHari.get(tgl) ?? [];
          const status = URUTAN.find((s) => hari.some((r) => r.status === s));
          const ket = hari.map((r) => `${r.session}: ${LABEL[r.status] ?? r.status}`).join(', ');
          return (
            <div key={tgl} title={ket || 'Belum ada data'} style={{ aspectRatio: '1', borderRadius: 8, display: 'grid', placeItems: 'center', fontWeight: 700, background: status ? WARNA[status] : '#F3F1EA', color: status ? '#fff' : '#9CA3AF' }}>{tgl}</div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10, fontSize: 11.5 }}>
        {['Present', 'Late', 'Sick', 'Excused', 'Absent'].map((s) => (
          <span key={s} style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}><span style={{ width: 10, height: 10, borderRadius: 3, background: WARNA[s] }} />{LABEL[s]} {jumlah(s)}</span>
        ))}
      </div>
    </div>
  );
}
