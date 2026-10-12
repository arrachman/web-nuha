import { prisma } from '@/lib/prisma';
import { ButtonLink, rp } from '@/components';
import { bacaAturanPerpus, dendaProspektif } from './data';

type Unit = { id: number; nama: string };

function fmtTanggal(d: Date) {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export async function TabDashboard({ unit }: { unit: Unit }) {
  const sekarang = new Date();
  const [totalJudul, totalEksemplar, dipinjam, terlambat, kembaliBulanIni, agregatDenda, eksemplarBermasalah, terlambatTeratas, aturan] = await Promise.all([
    prisma.book.count({ where: { unitId: unit.id } }),
    prisma.book.aggregate({ where: { unitId: unit.id }, _sum: { jumlah: true } }),
    prisma.bookLoan.count({ where: { unitId: unit.id, status: 'Dipinjam' } }),
    prisma.bookLoan.count({ where: { unitId: unit.id, status: 'Dipinjam', tanggalJatuhTempo: { lt: sekarang } } }),
    prisma.bookLoan.count({
      where: {
        unitId: unit.id,
        status: 'Dikembalikan',
        tanggalKembali: { gte: new Date(sekarang.getFullYear(), sekarang.getMonth(), 1) },
      },
    }),
    prisma.bookLoan.aggregate({
      where: { unitId: unit.id, status: 'Dikembalikan' },
      _sum: { denda: true, dendaDibayar: true },
    }),
    prisma.bookCopy.count({
      where: { unitId: unit.id, OR: [{ kondisi: { in: ['Rusak', 'Hilang'] } }, { status: 'Hilang' }] },
    }),
    prisma.bookLoan.findMany({
      where: { unitId: unit.id, status: 'Dipinjam', tanggalJatuhTempo: { lt: sekarang } },
      include: { book: { select: { kode: true, judul: true } } },
      orderBy: { tanggalJatuhTempo: 'asc' },
      take: 5,
    }),
    bacaAturanPerpus(unit.id),
  ]);

  const perKategori = await prisma.book.groupBy({
    by: ['kategori'],
    where: { unitId: unit.id },
    _count: { id: true },
    _sum: { jumlah: true },
    orderBy: { _count: { id: 'desc' } },
    take: 8,
  });

  const dendaBelumDibayar = Math.max(0, (agregatDenda._sum.denda ?? 0) - (agregatDenda._sum.dendaDibayar ?? 0));

  const kartu: { label: string; nilai: string | number }[] = [
    { label: 'Judul buku', nilai: totalJudul },
    { label: 'Total eksemplar', nilai: totalEksemplar._sum.jumlah ?? 0 },
    { label: 'Sedang dipinjam', nilai: dipinjam },
    { label: 'Terlambat kembali', nilai: terlambat },
    { label: 'Kembali bulan ini', nilai: kembaliBulanIni },
    { label: 'Denda belum dibayar', nilai: rp(dendaBelumDibayar) },
    { label: 'Eksemplar bermasalah', nilai: eksemplarBermasalah },
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Perlu ditagih — terlambat teratas</h3>
          <ButtonLink varian="sekunder" href="/perpustakaan/laporan" style={{ fontSize: 12.5 }}>Lihat laporan</ButtonLink>
        </div>
        {terlambatTeratas.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>Tidak ada keterlambatan. Semua peminjaman tertib.</p>
        ) : (
          <div className="tabel-wrap">
            <table>
              <thead><tr><th>Buku</th><th>Peminjam</th><th>Jatuh tempo</th><th className="num">Hari terlambat</th><th className="num">Denda prospektif</th></tr></thead>
              <tbody>
                {terlambatTeratas.map((l) => (
                  <tr key={String(l.id)}>
                    <td><div style={{ fontWeight: 600 }}>{l.book.judul}</div><div className="muted" style={{ fontSize: 11.5 }}>{l.book.kode}</div></td>
                    <td>{l.namaPeminjam}</td>
                    <td>{fmtTanggal(l.tanggalJatuhTempo)}</td>
                    <td className="num" style={{ color: 'var(--merah, #b3261e)', fontWeight: 700 }}>
                      {Math.floor((sekarang.getTime() - new Date(l.tanggalJatuhTempo).getTime()) / 86400000)}
                    </td>
                    <td className="num">{rp(dendaProspektif(l.tanggalJatuhTempo, aturan))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
