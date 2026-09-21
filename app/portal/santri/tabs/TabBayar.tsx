import { prisma } from '@/lib/prisma';
import { rupiah } from '@/lib/gaji';
import { Badge, Kosong } from '@/components';

const KOTAK: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #E8E3D9', borderRadius: 15, padding: 18 };

/** Read-only untuk santri — konfirmasi payments hanya bisa dilakukan wali lewat portal wali. */
export async function TabBayar({ santriId }: { santriId: bigint }) {
  const invoices = await prisma.invoice.findMany({
    where: { santriId },
    orderBy: { dueDate: 'desc' },
    include: { payments: { orderBy: { date: 'desc' }, take: 1 } },
  });
  const lunas = invoices.filter((t) => Number(t.paidAmount) >= Number(t.amount));
  const spp = invoices.find((t) => t.type.toLowerCase().includes('spp'));
  const tunggakan = invoices.reduce((s, t) => s + Math.max(0, Number(t.amount) - Number(t.paidAmount)), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div style={KOTAK}><div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.6, color: '#6B7280', fontWeight: 700 }}>Bulan lunas</div><div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 24, color: '#0F6B3D', fontWeight: 600, marginTop: 4 }}>{lunas.length}</div></div>
        <div style={KOTAK}><div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.6, color: '#6B7280', fontWeight: 700 }}>Tarif SPP</div><div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 20, color: '#0A4A2B', fontWeight: 600, marginTop: 6 }}>{spp ? rupiah(Number(spp.amount)) : '-'}</div></div>
        <div style={KOTAK}><div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.6, color: '#6B7280', fontWeight: 700 }}>Perlu diselesaikan</div><div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 20, color: '#B91C1C', fontWeight: 600, marginTop: 6 }}>{rupiah(tunggakan)}</div></div>
      </div>
      <div style={{ ...KOTAK, overflowX: 'auto' }}>
        <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 16, color: '#0A4A2B', fontWeight: 600, marginBottom: 4 }}>Riwayat payments saya</div>
        <div style={{ fontSize: 12.5, color: '#6B7280', marginBottom: 14 }}>Santri hanya dapat melihat; konfirmasi payments dilakukan wali melalui portal wali.</div>
        {invoices.length === 0 && <Kosong pesan="Belum ada invoices." />}
        {invoices.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead><tr style={{ background: '#FAF8F3' }}>
              {['Periode', 'Invoice', 'Dibayar', 'Sisa', 'Tgl bayar', 'Metode', 'Status'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '11px 12px', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6B7280', borderBottom: '1px solid #E8E3D9' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {invoices.map((h) => {
                const amount = Number(h.amount);
                const paidAmount = Number(h.paidAmount);
                const status = paidAmount >= amount ? 'Lunas' : paidAmount > 0 ? 'Sebagian' : 'Belum bayar';
                const terakhir = h.payments[0];
                return (
                  <tr key={String(h.id)}>
                    <td style={{ padding: '11px 12px', fontSize: 13, borderBottom: '1px solid #F5F2EA', color: '#1F2937', fontWeight: 600 }}>{h.period}</td>
                    <td style={{ padding: '11px 12px', fontSize: 13, borderBottom: '1px solid #F5F2EA', color: '#4B5563' }}>{rupiah(amount)}</td>
                    <td style={{ padding: '11px 12px', fontSize: 13, borderBottom: '1px solid #F5F2EA', color: '#0F6B3D', fontWeight: 600 }}>{rupiah(paidAmount)}</td>
                    <td style={{ padding: '11px 12px', fontSize: 13, borderBottom: '1px solid #F5F2EA', color: '#B91C1C' }}>{rupiah(Math.max(0, amount - paidAmount))}</td>
                    <td style={{ padding: '11px 12px', fontSize: 12.5, borderBottom: '1px solid #F5F2EA', color: '#4B5563' }}>{terakhir ? terakhir.date.toLocaleDateString('id-ID') : '-'}</td>
                    <td style={{ padding: '11px 12px', fontSize: 12.5, borderBottom: '1px solid #F5F2EA', color: '#4B5563' }}>{terakhir?.method ?? '-'}</td>
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid #F5F2EA' }}><Badge status={status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
