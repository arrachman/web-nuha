import { prisma } from '@/lib/prisma';
import { Kosong, rp } from '@/components';

/** Tab Keuangan: invoices & payments santri, digabung dari semua type (SPP/syahriyah/dll). */
export async function TabKeuangan({ santriId }: { santriId: bigint }) {
  const invoices = await prisma.invoice.findMany({
    where: { santriId },
    include: { santri: { include: { unit: true } } },
    orderBy: { dueDate: 'desc' },
  });

  const statusInvoice = (t: (typeof invoices)[number]) => {
    const paidAmount = Number(t.paidAmount);
    const amount = Number(t.amount);
    if (paidAmount >= amount) return { label: 'Lunas', bg: '#DCF0E3', fg: '#0F6B3D' };
    if (paidAmount > 0) return { label: 'Sebagian', bg: '#FEF3C7', fg: '#92400E' };
    return { label: 'Belum bayar', bg: '#FEE2E2', fg: '#991B1B' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h3 className="card-judul" style={{ marginBottom: 0 }}>Invoice &amp; payments</h3>
      {invoices.length === 0
        ? <Kosong pesan="Belum ada invoices untuk santri ini." />
        : invoices.map((t) => {
          const st = statusInvoice(t);
          return (
            <div key={String(t.id)} className="inset" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.type}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {t.period} · jatuh tempo {t.dueDate.toLocaleDateString('id-ID')} · {t.santri.unit?.nama ?? '-'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="muted" style={{ fontSize: 11.5 }}>Invoice</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--hijau-gelap)' }}>{rp(Number(t.amount))}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="muted" style={{ fontSize: 11.5 }}>Dibayar</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--hijau)' }}>{rp(Number(t.paidAmount))}</div>
              </div>
              <span className="badge" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
            </div>
          );
        })}
      <div className="alert alert-peringatan">
        <div>Invoice santri aktif menggabungkan SPP unit sekolah, syahriyah pondok, uang makan, dan laundry dalam satu invoice.</div>
      </div>
    </div>
  );
}
