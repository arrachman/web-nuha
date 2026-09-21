import { prisma } from '@/lib/prisma';
import { hitungGaji, rupiah } from '@/lib/gaji';
import { Card, ProgressBar, Kosong } from '@/components';

const WARNA_UNIT = ['#0F6B3D', '#1D4ED8', '#E8973A', '#7C2D12', '#5B21B6', '#9A3412'];

/** Rekap beban gaji per unit + ringkasan status slip period berjalan. */
export async function TabRekap({ periode }: { periode: string }) {
  const [pegawai, slips] = await Promise.all([
    prisma.staff.findMany({ include: { unit: true, salaryComponent: true } }),
    prisma.paySlip.findMany({ where: { period: periode } }),
  ]);

  const perUnit = new Map<string, { n: number; total: number }>();
  for (const p of pegawai) {
    const nama = p.unit?.nama ?? 'Yayasan';
    const h = hitungGaji(p.salaryComponent);
    const acc = perUnit.get(nama) ?? { n: 0, total: 0 };
    acc.n += 1;
    acc.total += h.netto;
    perUnit.set(nama, acc);
  }
  const rows = [...perUnit.entries()].sort((a, b) => b[1].total - a[1].total);
  const maxTotal = Math.max(1, ...rows.map(([, v]) => v.total));

  const statusN: Record<string, number> = {};
  for (const s of slips) statusN[s.status] = (statusN[s.status] ?? 0) + 1;
  const statusRows = Object.entries(statusN);

  return (
    <section className="grid g2">
      <Card judul="Beban gaji per unit">
        {rows.length === 0 ? (
          <Kosong pesan="Belum ada data pegawai." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {rows.map(([unit, v], i) => (
              <div key={unit}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
                  <span style={{ fontWeight: 600 }}>{unit} · {v.n} pegawai</span>
                  <strong>{rupiah(v.total)}</strong>
                </div>
                <ProgressBar pct={(v.total / maxTotal) * 100} warna={WARNA_UNIT[i % WARNA_UNIT.length]} />
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card judul={`Status slip · ${periode}`}>
        {statusRows.length === 0 ? (
          <Kosong pesan="Belum ada slip diterbitkan periode ini." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {statusRows.map(([status, n]) => (
              <div key={status} className="inset" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <span className="badge badge-hijau">{status}</span>
                <strong>{n} slip</strong>
              </div>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
