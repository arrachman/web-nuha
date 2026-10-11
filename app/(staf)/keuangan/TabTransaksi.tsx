import { prisma } from '@/lib/prisma';
import { readSession } from '@/lib/auth';
import { getUnitAktif } from '@/lib/unit-scope';
import { Card, Tabel, Kosong, rp } from '@/components';

export async function TabTransaksi() {
  const session = await readSession();
  const unitAktif = session ? await getUnitAktif(session) : null;
  const [rows, unit] = await Promise.all([
    prisma.cashTransaction.findMany({
      where: unitAktif != null ? { unitId: unitAktif } : undefined,
      orderBy: { date: 'desc' },
      take: 40,
      include: { unit: { select: { nama: true } } },
    }),
    unitAktif != null ? prisma.unit.findUnique({ where: { id: unitAktif }, select: { nama: true } }) : Promise.resolve(null),
  ]);

  return (
    <Card judul={unit ? `Riwayat transaksi kas — ${unit.nama}` : 'Riwayat transaksi kas yayasan'} sub={unit ? undefined : 'Semua unit. Pilih unit di pemilih unit halaman ini untuk memisahkan per unit.'}>
      {rows.length === 0 ? (
        <Kosong pesan="Belum ada transaksi kas tercatat." />
      ) : (
        <Tabel kolom={['Tanggal', 'Kode', 'Uraian', 'Unit', 'Metode', { label: 'Nominal', num: true }]}>
          {rows.map((t) => (
            <tr key={String(t.id)}>
              <td>{t.date.toLocaleDateString('id-ID', { dateStyle: 'medium' })}</td>
              <td className="muted">{t.code}</td>
              <td>{t.description}<div className="muted">{t.category}</div></td>
              <td className="muted">{t.unit?.nama ?? 'Umum'}</td>
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
