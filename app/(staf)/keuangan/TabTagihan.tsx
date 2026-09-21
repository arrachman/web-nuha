import { prisma } from '@/lib/prisma';
import { Card, Avatar, Tabel, Badge, Kosong, rp } from '@/components';

/** Status invoices diturunkan dari rasio paidAmount/amount — bukan kolom terpisah. */
function statusInvoice(amount: number, paidAmount: number): string {
  if (paidAmount <= 0) return 'Belum bayar';
  if (paidAmount >= amount) return 'Lunas';
  return 'Sebagian';
}

export async function TabInvoice({ q }: { q: string }) {
  const [rows, tarifPerJenis] = await Promise.all([
    prisma.invoice.findMany({
      where: q ? { santri: { person: { fullName: { contains: q } } } } : undefined,
      include: { santri: { include: { person: true, unit: true } } },
      orderBy: { dueDate: 'desc' },
      take: 30,
    }),
    // Nominal berlaku per jenis diambil dari tagihan dengan periode terbaru untuk jenis tersebut.
    prisma.invoice.groupBy({ by: ['type'], _max: { period: true, dueDate: true }, orderBy: { type: 'asc' } }),
  ]);

  const tarif = await Promise.all(
    tarifPerJenis.map(async (t) => {
      const contoh = await prisma.invoice.findFirst({
        where: { type: t.type, period: t._max.period ?? undefined },
        orderBy: { dueDate: 'desc' },
      });
      return { item: t.type, ket: `periode ${t._max.period ?? '-'}`, n: rp(Number(contoh?.amount ?? 0)) };
    }),
  );

  return (
    <div className="grid g2" style={{ gridTemplateColumns: '1fr 300px', alignItems: 'start' }}>
      <Card judul="Tagihan santri" sub={q ? `Pencarian: "${q}"` : 'Seluruh tagihan, diurutkan dari jatuh tempo terbaru.'}>
        <form method="get" style={{ marginBottom: 14, display: 'flex', gap: 8 }}>
          <input type="hidden" name="tab" value="invoices" />
          <input
            className="field"
            name="q"
            defaultValue={q}
            placeholder="Cari nama santri"
            style={{ minWidth: 220 }}
          />
          <button type="submit" className="btn">Cari</button>
        </form>
        {rows.length === 0 ? (
          <Kosong pesan="Tidak ada invoices yang cocok dengan pencarian." />
        ) : (
          <Tabel kolom={['Santri', 'Komponen', { label: 'Tagihan', num: true }, { label: 'Sisa', num: true }, 'Status']}>
            {rows.map((t) => {
              const amount = Number(t.amount);
              const paidAmount = Number(t.paidAmount);
              const sisa = Math.max(0, amount - paidAmount);
              const status = statusInvoice(amount, paidAmount);
              return (
                <tr key={String(t.id)}>
                  <td>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <Avatar nama={t.santri.person.fullName} size={30} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{t.santri.person.fullName}</div>
                        <div className="muted">{t.santri.nis} · {t.santri.unit?.nama ?? '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {t.type}
                    <div className="muted">jatuh tempo {t.dueDate.toLocaleDateString('id-ID', { dateStyle: 'medium' })}</div>
                  </td>
                  <td className="num">{rp(amount)}</td>
                  <td className="num" style={{ color: sisa > 0 ? '#B91C1C' : undefined, fontWeight: 700 }}>{rp(sisa)}</td>
                  <td><Badge status={status} /></td>
                </tr>
              );
            })}
          </Tabel>
        )}
      </Card>
      <Card judul="Nominal berjalan per jenis" sub="Diambil dari periode tagihan terbaru tiap jenis.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tarif.length === 0 ? <Kosong /> : tarif.map((x) => (
            <div key={x.item} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, paddingBottom: 9, borderBottom: '1px solid #F5F2EA' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{x.item}</div>
                <div className="muted">{x.ket}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--hijau-gelap)' }}>{x.n}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
