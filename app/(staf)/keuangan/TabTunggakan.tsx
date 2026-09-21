import { prisma } from '@/lib/prisma';
import { Card, Avatar, Badge, Kosong, rp, Pagination, UKURAN_HALAMAN, bacaHalaman, type SearchParams } from '@/components';

function hrefTunggakan(params: Record<string, string>) {
  const qs = new URLSearchParams({ tab: 'tunggakan', ...params });
  for (const [k, v] of [...qs.entries()]) if (!v) qs.delete(k);
  return `/keuangan?${qs.toString()}`;
}

/** "Belum lunas" bergantung pada perbandingan dua kolom (paidAmount < amount), Prisma
 * where tidak bisa bandingkan kolom langsung — ambil id yang cocok lewat raw query,
 * lalu potong per halaman sebelum findMany+include supaya tidak menarik semua baris. */
export async function TabTunggakan({ searchParams }: { searchParams: SearchParams }) {
  const halaman = bacaHalaman(searchParams);

  const idRows = await prisma.$queryRaw<{ id: bigint }[]>`
    SELECT id FROM invoices WHERE paidAmount < amount ORDER BY jatuh_tempo ASC
  `;
  const total = idRows.length;
  const idHalaman = idRows.slice((halaman - 1) * UKURAN_HALAMAN, halaman * UKURAN_HALAMAN).map((r) => r.id);
  const totalHalaman = Math.max(1, Math.ceil(total / UKURAN_HALAMAN));

  const rows = idHalaman.length
    ? await prisma.invoice.findMany({
      where: { id: { in: idHalaman } },
      include: { santri: { include: { person: true, unit: true } } },
    })
    : [];
  const posisi = new Map(idHalaman.map((id, i) => [id, i]));
  const tunggakan = rows.sort((a, b) => (posisi.get(a.id) ?? 0) - (posisi.get(b.id) ?? 0));

  return (
    <Card
      judul={`Daftar tunggakan — ${total} santri`}
      sub="Prioritas penagihan: hubungi wali via WhatsApp, tembusan ke musyrif asrama."
    >
      {tunggakan.length === 0 ? (
        <Kosong pesan="Tidak ada tunggakan tercatat saat ini." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tunggakan.map((t) => {
            const sisa = Number(t.amount) - Number(t.paidAmount);
            const status = Number(t.paidAmount) > 0 ? 'Sebagian' : 'Belum bayar';
            return (
              <div
                key={String(t.id)}
                style={{
                  display: 'flex', gap: 14, alignItems: 'center', padding: '14px 16px', borderRadius: 13,
                  background: '#FEF7F7', border: '1px solid #F0D5D5', flexWrap: 'wrap',
                }}
              >
                <Avatar nama={t.santri.person.fullName} size={36} />
                <div style={{ flex: 1, minWidth: 170 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.santri.person.fullName}</div>
                  <div className="muted">{t.santri.unit?.nama ?? '-'} · {t.type}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="muted">Kurang</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#B91C1C' }}>{rp(sisa)}</div>
                </div>
                <Badge status={status} />
              </div>
            );
          })}
        </div>
      )}
      <Pagination
        halaman={halaman}
        totalHalaman={totalHalaman}
        total={total}
        jumlahBaris={tunggakan.length}
        ukuranHalaman={UKURAN_HALAMAN}
        buatHref={(p) => hrefTunggakan({ halaman: String(p) })}
      />
    </Card>
  );
}
