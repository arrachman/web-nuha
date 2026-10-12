import { prisma } from '@/lib/prisma';
import { ButtonLink, Kosong, rp } from '@/components';
import { bacaAturanPerpus, dendaProspektif } from './data';

type Unit = { id: number; nama: string };

function fmtTanggal(d: Date) {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export async function TabLaporan({ unit }: { unit: Unit }) {
  const sekarang = new Date();
  const [terlambat, riwayat, aturan, agregatDenda] = await Promise.all([
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
    bacaAturanPerpus(unit.id),
    prisma.bookLoan.aggregate({
      where: { unitId: unit.id, status: 'Dikembalikan' },
      _sum: { denda: true, dendaDibayar: true },
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

  // Anggota teraktif: gabungan santri & staf berdasarkan jumlah pinjaman.
  const [grupSantri, grupStaf] = await Promise.all([
    prisma.bookLoan.groupBy({
      by: ['santriId'],
      where: { unitId: unit.id, santriId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
    prisma.bookLoan.groupBy({
      by: ['staffId'],
      where: { unitId: unit.id, staffId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
  ]);
  const idSantri = grupSantri.flatMap((g) => (g.santriId != null ? [g.santriId] : []));
  const idStaf = grupStaf.flatMap((g) => (g.staffId != null ? [g.staffId] : []));
  const [infoSantri, infoStaf] = await Promise.all([
    idSantri.length
      ? prisma.santri.findMany({ where: { id: { in: idSantri } }, select: { id: true, person: { select: { fullName: true } } } })
      : Promise.resolve([] as { id: bigint; person: { fullName: string } }[]),
    idStaf.length
      ? prisma.staff.findMany({ where: { id: { in: idStaf } }, select: { id: true, person: { select: { fullName: true } } } })
      : Promise.resolve([] as { id: bigint; person: { fullName: string } }[]),
  ]);
  const namaSantri = new Map(infoSantri.map((s) => [String(s.id), s.person.fullName]));
  const namaStaf = new Map(infoStaf.map((s) => [String(s.id), s.person.fullName]));
  // Cadangan nama dari namaPeminjam untuk anggota yang datanya sudah terhapus.
  const hilangSantri = idSantri.filter((id) => !namaSantri.has(String(id)));
  const hilangStaf = idStaf.filter((id) => !namaStaf.has(String(id)));
  if (hilangSantri.length || hilangStaf.length) {
    const pinjaman = await prisma.bookLoan.findMany({
      where: { OR: [{ santriId: { in: hilangSantri } }, { staffId: { in: hilangStaf } }] },
      select: { santriId: true, staffId: true, namaPeminjam: true },
      orderBy: { tanggalPinjam: 'desc' },
    });
    for (const l of pinjaman) {
      if (l.santriId != null && !namaSantri.has(String(l.santriId))) namaSantri.set(String(l.santriId), l.namaPeminjam);
      if (l.staffId != null && !namaStaf.has(String(l.staffId))) namaStaf.set(String(l.staffId), l.namaPeminjam);
    }
  }
  const anggotaTeraktif = [
    ...grupSantri.map((g) => ({
      nama: (g.santriId != null && namaSantri.get(String(g.santriId))) || 'Santri',
      tipe: 'Santri',
      jumlah: g._count.id,
    })),
    ...grupStaf.map((g) => ({
      nama: (g.staffId != null && namaStaf.get(String(g.staffId))) || 'Staf',
      tipe: 'Staf / Guru',
      jumlah: g._count.id,
    })),
  ].sort((a, b) => b.jumlah - a.jumlah).slice(0, 10);

  const totalDenda = agregatDenda._sum.denda ?? 0;
  const totalDibayar = agregatDenda._sum.dendaDibayar ?? 0;
  const belumDibayar = Math.max(0, totalDenda - totalDibayar);
  const totalProspektif = terlambat.reduce((s, l) => s + dendaProspektif(l.tanggalJatuhTempo, aturan), 0);

  const kartuDenda = [
    { label: 'Total denda tercatat', nilai: rp(totalDenda) },
    { label: 'Sudah dibayar', nilai: rp(totalDibayar) },
    { label: 'Belum dibayar', nilai: rp(belumDibayar) },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <ButtonLink varian="sekunder" href={`/api/perpustakaan/laporan?jenis=transaksi&unit=${unit.id}`}>Ekspor transaksi (CSV)</ButtonLink>
        <ButtonLink varian="sekunder" href={`/api/perpustakaan/laporan?jenis=terlambat&unit=${unit.id}`}>Ekspor keterlambatan (CSV)</ButtonLink>
        <ButtonLink varian="sekunder" href={`/api/perpustakaan/laporan?jenis=denda&unit=${unit.id}`}>Ekspor denda (CSV)</ButtonLink>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        {kartuDenda.map((k) => (
          <div key={k.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{k.nilai}</div>
            <div className="muted" style={{ fontSize: 12.5 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ margin: '0 0 12px' }}>Buku terlambat dikembalikan — {unit.nama}</h3>
        {terlambat.length === 0 ? <Kosong pesan="Tidak ada keterlambatan. Semua peminjaman tertib." /> : (
          <div className="tabel-wrap">
            <table>
              <thead><tr><th>Buku</th><th>Peminjam</th><th>Jatuh tempo</th><th className="num">Hari terlambat</th><th className="num">Denda (prospektif)</th></tr></thead>
              <tbody>
                {terlambat.map((l) => (
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
              <tfoot>
                <tr>
                  <td colSpan={4} style={{ fontWeight: 700 }}>Total denda prospektif (bila dikembalikan hari ini)</td>
                  <td className="num" style={{ fontWeight: 700 }}>{rp(totalProspektif)}</td>
                </tr>
              </tfoot>
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
        <h3 style={{ margin: '0 0 12px' }}>Anggota teraktif</h3>
        {anggotaTeraktif.length === 0 ? <Kosong pesan="Belum ada data peminjaman." /> : (
          <div className="tabel-wrap">
            <table>
              <thead><tr><th>Anggota</th><th>Tipe</th><th className="num">Kali meminjam</th></tr></thead>
              <tbody>
                {anggotaTeraktif.map((a, i) => (
                  <tr key={`${a.tipe}-${a.nama}-${i}`}>
                    <td style={{ fontWeight: 600 }}>{a.nama}</td>
                    <td>{a.tipe}</td>
                    <td className="num">{a.jumlah}</td>
                  </tr>
                ))}
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
