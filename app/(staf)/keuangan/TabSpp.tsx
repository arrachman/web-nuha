import { prisma } from '@/lib/prisma';
import { Card, Avatar, Tabel, Badge, Kosong, rp } from '@/components';

/** Status invoices diturunkan dari rasio paidAmount/amount — sama seperti TabInvoice. */
function statusInvoice(amount: number, paidAmount: number): string {
  if (paidAmount <= 0) return 'Belum bayar';
  if (paidAmount >= amount) return 'Lunas';
  return 'Sebagian';
}

export async function TabSpp({ anakId }: { anakId?: string }) {
  const opsiAnak = await prisma.santri.findMany({
    include: { person: true },
    orderBy: { person: { fullName: 'asc' } },
  });
  if (opsiAnak.length === 0) return <Kosong pesan="Belum ada data santri." />;

  const terpilih = opsiAnak.find((s) => String(s.id) === anakId) ?? opsiAnak[0];
  const anak = await prisma.santri.findUniqueOrThrow({
    where: { id: terpilih.id },
    include: { person: true, unit: true, kelas: true },
  });
  const riwayat = await prisma.invoice.findMany({
    where: { santriId: anak.id },
    include: { payments: { orderBy: { date: 'desc' } } },
    orderBy: { dueDate: 'desc' },
  });

  const lunasN = riwayat.filter((t) => Number(t.paidAmount) >= Number(t.amount)).length;
  const totalBayar = riwayat.reduce((sum, t) => sum + Number(t.paidAmount), 0);
  const tarifBerjalan = riwayat.length > 0 ? Number(riwayat[0].amount) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <Avatar nama={anak.person.fullName} size={52} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 19, color: 'var(--hijau-gelap)', fontWeight: 600 }}>{anak.person.fullName}</div>
            <div className="muted">{anak.unit?.nama ?? '-'} {anak.kelas?.nama ?? ''} · NIS {anak.nis} · {anak.status} · tarif {rp(tarifBerjalan)}/invoices</div>
          </div>
          <form method="get" style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <input type="hidden" name="tab" value="spp" />
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span className="label">Pilih anak</span>
              <select className="field" name="anak" defaultValue={String(anak.id)} style={{ minWidth: 220 }}>
                {opsiAnak.map((o) => (
                  <option key={String(o.id)} value={String(o.id)}>{o.person.fullName}</option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn">Tampilkan</button>
          </form>
        </div>
      </Card>

      <section className="grid g3">
        <div className="card">
          <div className="label">Invoice lunas</div>
          <div className="angka" style={{ color: '#0F6B3D' }}>{lunasN} / {riwayat.length}</div>
        </div>
        <div className="card">
          <div className="label">Total diterima</div>
          <div className="angka-sm">{rp(totalBayar)}</div>
        </div>
        <div className="card">
          <div className="label">Tarif berjalan</div>
          <div className="angka-sm" style={{ color: '#E8973A' }}>{rp(tarifBerjalan)}</div>
        </div>
      </section>

      <Card judul="Riwayat invoices &amp; payments" sub="Seluruh invoices santri ini yang tercatat di sistem.">
        {riwayat.length === 0 ? (
          <Kosong pesan="Belum ada invoices tercatat untuk santri ini." />
        ) : (
          <Tabel kolom={['Periode', { label: 'Invoice', num: true }, { label: 'Dibayar', num: true }, { label: 'Sisa', num: true }, 'Tgl bayar terakhir', 'Metode', 'Status']}>
            {riwayat.map((t) => {
              const amount = Number(t.amount);
              const paidAmount = Number(t.paidAmount);
              const sisa = Math.max(0, amount - paidAmount);
              const bayarTerakhir = t.payments[0];
              return (
                <tr key={String(t.id)}>
                  <td style={{ fontWeight: 600 }}>{t.period}</td>
                  <td className="num">{rp(amount)}</td>
                  <td className="num" style={{ color: '#0F6B3D' }}>{rp(paidAmount)}</td>
                  <td className="num" style={{ color: sisa > 0 ? '#B91C1C' : undefined }}>{rp(sisa)}</td>
                  <td>{bayarTerakhir ? bayarTerakhir.date.toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '—'}</td>
                  <td>{bayarTerakhir?.method ?? '—'}</td>
                  <td><Badge status={statusInvoice(amount, paidAmount)} /></td>
                </tr>
              );
            })}
          </Tabel>
        )}
      </Card>
    </div>
  );
}
