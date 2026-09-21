import { prisma } from '@/lib/prisma';
import { Card, Avatar, Tabel, Badge, ProgressBar, Kosong, rp } from '@/components';

/** Ketaatan payments per santri diringkas dari seluruh tagihannya. */
function statusKetaatan(amount: number, paidAmount: number): string {
  if (amount <= 0) return 'Lancar';
  const rasio = paidAmount / amount;
  if (rasio >= 1) return 'Lancar';
  if (rasio > 0) return 'Cicil';
  return 'Menunggak';
}
const WARNA_STATUS: Record<string, string> = { Lancar: '#0F6B3D', Cicil: '#E8973A', Menunggak: '#B91C1C' };

export async function TabRekap({ q }: { q: string }) {
  const santri = await prisma.santri.findMany({
    where: q
      ? { OR: [{ person: { fullName: { contains: q } } }, { nis: { contains: q } }] }
      : undefined,
    include: { person: true, unit: true, kelas: true, invoices: true },
    orderBy: { person: { fullName: 'asc' } },
    take: 30,
  });

  const rekap = santri.map((s) => {
    const totalNominal = s.invoices.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalDibayar = s.invoices.reduce((sum, t) => sum + Number(t.paidAmount), 0);
    const sisa = Math.max(0, totalNominal - totalDibayar);
    const lunasCount = s.invoices.filter((t) => Number(t.paidAmount) >= Number(t.amount)).length;
    return {
      santri: s,
      status: statusKetaatan(totalNominal, totalDibayar),
      pct: totalNominal > 0 ? Math.round((totalDibayar / totalNominal) * 100) : 100,
      lunasCount,
      totalInvoice: s.invoices.length,
      totalNominal,
      sisa,
    };
  });

  const lancar = rekap.filter((r) => r.status === 'Lancar').length;
  const cicil = rekap.filter((r) => r.status === 'Cicil').length;
  const nunggak = rekap.filter((r) => r.status === 'Menunggak').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <section className="grid g3">
        <div className="card">
          <div className="label">Payment lancar</div>
          <div className="angka" style={{ color: '#0F6B3D' }}>{lancar}</div>
        </div>
        <div className="card">
          <div className="label">Mencicil</div>
          <div className="angka" style={{ color: '#E8973A' }}>{cicil}</div>
        </div>
        <div className="card">
          <div className="label">Menunggak</div>
          <div className="angka" style={{ color: '#B91C1C' }}>{nunggak}</div>
        </div>
      </section>

      <Card
        judul="Rekap nama santri &amp; ketaatan payments"
        sub="Persentase dihitung dari total paidAmount dibagi total invoices tiap santri."
      >
        <form method="get" style={{ marginBottom: 14, display: 'flex', gap: 8 }}>
          <input type="hidden" name="tab" value="rekap" />
          <input className="field" name="q" defaultValue={q} placeholder="Cari nama / NIS" style={{ minWidth: 220 }} />
          <button type="submit" className="btn">Cari</button>
        </form>
        {rekap.length === 0 ? (
          <Kosong pesan="Tidak ada santri yang cocok dengan pencarian." />
        ) : (
          <Tabel kolom={['Nama santri', 'Unit / Kelas', 'Ketaatan', { label: 'Invoice', num: true }, { label: 'Sisa', num: true }, 'Status']}>
            {rekap.map((r) => (
              <tr key={String(r.santri.id)}>
                <td>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <Avatar nama={r.santri.person.fullName} size={30} />
                    <div>
                      <div style={{ fontWeight: 600 }}>{r.santri.person.fullName}</div>
                      <div className="muted">NIS {r.santri.nis}</div>
                    </div>
                  </div>
                </td>
                <td>{r.santri.unit?.nama ?? '-'} {r.santri.kelas?.nama ?? ''}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ width: 100 }}><ProgressBar pct={r.pct} warna={WARNA_STATUS[r.status]} /></div>
                    <span className="muted">{r.lunasCount}/{r.totalInvoice}</span>
                  </div>
                </td>
                <td className="num">{rp(r.totalNominal)}</td>
                <td className="num" style={{ color: r.sisa > 0 ? '#B91C1C' : undefined, fontWeight: 700 }}>{rp(r.sisa)}</td>
                <td><Badge status={r.status} /></td>
              </tr>
            ))}
          </Tabel>
        )}
      </Card>
    </div>
  );
}
