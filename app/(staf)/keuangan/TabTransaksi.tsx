import { prisma } from '@/lib/prisma';
import { Card, Tabel, Kosong, rp } from '@/components';

export async function TabTransaksi() {
  const rows = await prisma.cashTransaction.findMany({ orderBy: { date: 'desc' }, take: 40 });

  return (
    <Card judul="Riwayat transaksi kas yayasan">
      {rows.length === 0 ? (
        <Kosong pesan="Belum ada transaksi kas tercatat." />
      ) : (
        <Tabel kolom={['Tanggal', 'Kode', 'Uraian', 'Metode', { label: 'Nominal', num: true }]}>
          {rows.map((t) => (
            <tr key={String(t.id)}>
              <td>{t.date.toLocaleDateString('id-ID', { dateStyle: 'medium' })}</td>
              <td className="muted">{t.code}</td>
              <td>{t.description}<div className="muted">{t.category}</div></td>
              <td className="muted">{t.method}</td>
              <td className="num" style={{ fontWeight: 700, color: t.direction === 'Inbound' ? '#0F6B3D' : '#B91C1C' }}>
                {t.direction === 'Inbound' ? '+' : '-'} {rp(Number(t.amount))}
              </td>
            </tr>
          ))}
        </Tabel>
      )}
    </Card>
  );
}
