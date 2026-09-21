import { prisma } from '@/lib/prisma';
import { Card, Tabel, Kosong, Badge } from '@/components';

/** Riwayat seluruh kunjungan; pencarian nama wali/santri lewat query ?q=. */
export async function TabRiwayat({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const raw = searchParams.q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? '';

  const kunjungan = await prisma.kunjungan.findMany({
    where: q
      ? { OR: [{ namaWali: { contains: q } }, { santri: { person: { fullName: { contains: q } } } }] }
      : undefined,
    include: { santri: { include: { person: true } } },
    orderBy: { tgl: 'desc' },
    take: 50,
  });

  return (
    <Card
      judul="Riwayat buku tamu"
      aksi={
        <form method="get" style={{ display: 'flex', gap: 8 }}>
          <input type="hidden" name="tab" value="riwayat" />
          <input className="field" name="q" defaultValue={q} placeholder="Cari wali / santri" style={{ minWidth: 200 }} />
        </form>
      }
    >
      {kunjungan.length === 0 ? (
        <Kosong pesan="Tidak ada kunjungan yang cocok dengan pencarian." />
      ) : (
        <Tabel kolom={['Tanggal', 'Wali', 'Santri', 'Keperluan', 'Masuk', 'Keluar', 'Status']}>
          {kunjungan.map((k) => (
            <tr key={String(k.id)}>
              <td>{k.tgl.toLocaleDateString('id-ID')}</td>
              <td>{k.namaWali}<div className="muted">{k.hubungan ?? '-'}</div></td>
              <td>{k.santri.person.fullName}</td>
              <td style={{ maxWidth: 220 }}>{k.keperluan ?? '-'}</td>
              <td>{k.jamMasuk ?? '-'}</td>
              <td>{k.jamKeluar ?? '-'}</td>
              <td><Badge status={k.status} /></td>
            </tr>
          ))}
        </Tabel>
      )}
    </Card>
  );
}
