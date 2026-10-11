import { prisma } from '@/lib/prisma';

type Unit = { id: number; nama: string };

export async function TabDashboard({ unit }: { unit: Unit }) {
  const [totalJudul, totalEksemplar, dipinjam, terlambat, kembaliBulanIni] = await Promise.all([
    prisma.book.count({ where: { unitId: unit.id } }),
    prisma.book.aggregate({ where: { unitId: unit.id }, _sum: { jumlah: true } }),
    prisma.bookLoan.count({ where: { unitId: unit.id, status: 'Dipinjam' } }),
    prisma.bookLoan.count({ where: { unitId: unit.id, status: 'Dipinjam', tanggalJatuhTempo: { lt: new Date() } } }),
    prisma.bookLoan.count({
      where: {
        unitId: unit.id,
        status: 'Dikembalikan',
        tanggalKembali: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
  ]);

  const perKategori = await prisma.book.groupBy({
    by: ['kategori'],
    where: { unitId: unit.id },
    _count: { id: true },
    _sum: { jumlah: true },
    orderBy: { _count: { id: 'desc' } },
    take: 8,
  });

  const kartu = [
    { label: 'Judul buku', nilai: totalJudul },
    { label: 'Total eksemplar', nilai: totalEksemplar._sum.jumlah ?? 0 },
    { label: 'Sedang dipinjam', nilai: dipinjam },
    { label: 'Terlambat kembali', nilai: terlambat },
    { label: 'Kembali bulan ini', nilai: kembaliBulanIni },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        {kartu.map((k) => (
          <div key={k.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 30, fontWeight: 700 }}>{k.nilai}</div>
            <div className="muted" style={{ fontSize: 12.5 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ margin: '0 0 12px' }}>Koleksi per kategori — {unit.nama}</h3>
        {perKategori.length === 0 ? (
          <p className="muted">Belum ada buku di katalog unit ini.</p>
        ) : (
          <table className="tabel">
            <thead><tr><th>Kategori</th><th className="num">Judul</th><th className="num">Eksemplar</th></tr></thead>
            <tbody>
              {perKategori.map((r) => (
                <tr key={r.kategori ?? '-'}>
                  <td>{r.kategori || <span className="muted">Tanpa kategori</span>}</td>
                  <td className="num">{r._count.id}</td>
                  <td className="num">{r._sum.jumlah ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
