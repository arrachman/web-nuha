import { prisma } from '@/lib/prisma';
import { Kosong } from '@/components';

type Unit = { id: number; nama: string };

function fmtTanggal(d: Date) {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export async function TabLaporan({ unit }: { unit: Unit }) {
  const sekarang = new Date();
  const [terlambat, riwayat] = await Promise.all([
    prisma.bookLoan.findMany({
      where: { unitId: unit.id, status: 'Dipinjam', tanggalJatuhTempo: { lt: sekarang } },
      include: { book: { select: { kode: true, judul: true } } },
      orderBy: { tanggalJatuhTempo: 'asc' },
      take: 100,
    }),
    prisma.bookLoan.findMany({
      where: { unitId: unit.id },
      include: { book: { select: { kode: true, judul: true } } },
      orderBy: { tanggalPinjam: 'desc' },
      take: 50,
    }),
  ]);

  const bukuTerlaris = await prisma.bookLoan.groupBy({
    by: ['bookId'],
    where: { unitId: unit.id },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });
  const infoBuku = await prisma.book.findMany({
    where: { id: { in: bukuTerlaris.map((b) => b.bookId) } },
    select: { id: true, kode: true, judul: true, jumlah: true },
  });
  const petaBuku = new Map(infoBuku.map((b) => [String(b.id), b]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <h3 style={{ margin: '0 0 12px' }}>Buku terlambat dikembalikan — {unit.nama}</h3>
        {terlambat.length === 0 ? <Kosong pesan="Tidak ada keterlambatan. Semua peminjaman tertib." /> : (
          <div className="tabel-wrap">
            <table>
              <thead><tr><th>Buku</th><th>Peminjam</th><th>Jatuh tempo</th><th className="num">Hari terlambat</th></tr></thead>
              <tbody>
                {terlambat.map((l) => (
                  <tr key={String(l.id)}>
                    <td><div style={{ fontWeight: 600 }}>{l.book.judul}</div><div className="muted" style={{ fontSize: 11.5 }}>{l.book.kode}</div></td>
                    <td>{l.namaPeminjam}</td>
                    <td>{fmtTanggal(l.tanggalJatuhTempo)}</td>
                    <td className="num" style={{ color: 'var(--merah, #b3261e)', fontWeight: 700 }}>
                      {Math.floor((sekarang.getTime() - new Date(l.tanggalJatuhTempo).getTime()) / 86400000)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ margin: '0 0 12px' }}>Buku paling sering dipinjam</h3>
        {bukuTerlaris.length === 0 ? <Kosong pesan="Belum ada data peminjaman." /> : (
          <div className="tabel-wrap">
            <table>
              <thead><tr><th>Kode</th><th>Judul</th><th className="num">Kali dipinjam</th><th className="num">Eksemplar</th></tr></thead>
              <tbody>
                {bukuTerlaris.map((r) => {
                  const b = petaBuku.get(String(r.bookId));
                  if (!b) return null;
                  return (
                    <tr key={String(r.bookId)}>
                      <td style={{ fontWeight: 600 }}>{b.kode}</td>
                      <td>{b.judul}</td>
                      <td className="num">{r._count.id}</td>
                      <td className="num">{b.jumlah}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ margin: '0 0 12px' }}>Riwayat peminjaman terakhir (50)</h3>
        {riwayat.length === 0 ? <Kosong pesan="Belum ada riwayat." /> : (
          <div className="tabel-wrap">
            <table>
              <thead><tr><th>Buku</th><th>Peminjam</th><th>Pinjam</th><th>Kembali</th><th>Status</th></tr></thead>
              <tbody>
                {riwayat.map((l) => (
                  <tr key={String(l.id)}>
                    <td><div style={{ fontWeight: 600 }}>{l.book.judul}</div><div className="muted" style={{ fontSize: 11.5 }}>{l.book.kode}</div></td>
                    <td>{l.namaPeminjam}</td>
                    <td>{fmtTanggal(l.tanggalPinjam)}</td>
                    <td>{l.tanggalKembali ? fmtTanggal(l.tanggalKembali) : <span className="muted">-</span>}</td>
                    <td><span className="pill">{l.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
