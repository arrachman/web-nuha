import { prisma } from '@/lib/prisma';
import { rupiah } from '@/lib/gaji';
import { Badge, Kosong } from '@/components';

export async function TabRiwayat({ santriId }: { santriId: bigint }) {
  const invoices = await prisma.invoice.findMany({
    where: { santriId },
    orderBy: { dueDate: 'desc' },
    take: 20,
    include: { payments: { orderBy: { date: 'desc' }, take: 1 } },
  });
  const lunasN = invoices.filter((t) => Number(t.paidAmount) >= Number(t.amount)).length;
  const totalBayar = invoices.reduce((sum, t) => sum + Number(t.paidAmount), 0);

  return (
    <>
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E3D9', borderRadius: 14, padding: 16 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: '#6B7280', fontWeight: 700 }}>Ketaatan payments</div>
        <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 24, color: '#0F6B3D', fontWeight: 600, marginTop: 4 }}>{lunasN}/{invoices.length} lunas</div>
        <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 2 }}>Total diterima yayasan: {rupiah(totalBayar)}</div>
      </div>

      <div style={{ background: '#FFFFFF', border: '1px solid #E8E3D9', borderRadius: 14, padding: 16, marginTop: 14 }}>
        <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 15, color: '#0A4A2B', fontWeight: 600, marginBottom: 10 }}>Riwayat payments SPP</div>
        {invoices.length === 0 && <Kosong pesan="Belum ada riwayat payments." />}
        {invoices.map((h) => {
          const amount = Number(h.amount);
          const paidAmount = Number(h.paidAmount);
          const status = paidAmount >= amount ? 'Lunas' : paidAmount > 0 ? 'Sebagian' : 'Belum bayar';
          const terakhir = h.payments[0];
          return (
            <div key={String(h.id)} style={{ padding: '12px 13px', borderRadius: 11, border: '1px solid #F0EDE4', background: '#FAF8F3', marginBottom: 9 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1F2937' }}>{h.period}</span>
                <Badge status={status} />
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 7, flexWrap: 'wrap' }}>
                <div><div style={{ fontSize: 10.5, color: '#6B7280' }}>Invoice</div><div style={{ fontSize: 12.5, fontWeight: 600, color: '#0A4A2B' }}>{rupiah(amount)}</div></div>
                <div><div style={{ fontSize: 10.5, color: '#6B7280' }}>Dibayar</div><div style={{ fontSize: 12.5, fontWeight: 600, color: '#0F6B3D' }}>{rupiah(paidAmount)}</div></div>
                <div><div style={{ fontSize: 10.5, color: '#6B7280' }}>Sisa</div><div style={{ fontSize: 12.5, fontWeight: 600, color: '#B91C1C' }}>{rupiah(Math.max(0, amount - paidAmount))}</div></div>
              </div>
              {terakhir && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>{terakhir.date.toLocaleDateString('id-ID')} · {terakhir.method}{terakhir.reference ? ` · reference ${terakhir.reference}` : ''}</div>}
            </div>
          );
        })}
      </div>
    </>
  );
}
