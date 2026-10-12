import { prisma } from '@/lib/prisma';
import { Button, ButtonLink, Input, Kosong, Pagination, Select, Tabel, UKURAN_HALAMAN, bacaHalaman, satu, type SearchParams } from '@/components';
import { KATEGORI_BUKU } from './data';
import { hapusBuku } from './actions';

type Unit = { id: number; nama: string };

const gayaInput = { padding: '9px 11px', borderRadius: 10, border: '1px solid var(--garis)' } as const;

export async function TabKatalog({ unit, sp }: { unit: Unit; sp: SearchParams }) {
  const q = satu(sp.q);
  const kategori = satu(sp.kategori);
  const halaman = bacaHalaman(sp);

  const where = {
    unitId: unit.id,
    ...(q ? { OR: [{ judul: { contains: q } }, { kode: { contains: q } }, { penulis: { contains: q } }, { isbn: { contains: q } }] } : {}),
    ...(kategori ? { kategori } : {}),
  };
  const [total, daftar] = await Promise.all([
    prisma.book.count({ where }),
    prisma.book.findMany({
      where,
      orderBy: { judul: 'asc' },
      skip: (halaman - 1) * UKURAN_HALAMAN,
      take: UKURAN_HALAMAN,
      include: { _count: { select: { loans: { where: { status: 'Dipinjam' } } } } },
    }),
  ]);
  const totalHalaman = Math.max(1, Math.ceil(total / UKURAN_HALAMAN));

  // Ringkasan eksemplar per buku di halaman ini: total, yang tersedia, dan
  // penanda kondisi rusak/hilang (dari tabel book_copies).
  const idBuku = daftar.map((b) => b.id);
  const [perStatus, perKondisi] = idBuku.length
    ? await Promise.all([
        prisma.bookCopy.groupBy({ by: ['bookId', 'status'], where: { bookId: { in: idBuku } }, _count: { _all: true } }),
        prisma.bookCopy.groupBy({ by: ['bookId', 'kondisi'], where: { bookId: { in: idBuku }, kondisi: { in: ['Rusak', 'Hilang'] } }, _count: { _all: true } }),
      ])
    : [[], []];
  const ringkas = new Map<string, { total: number; tersedia: number; rusak: number; hilang: number }>();
  const entri = (bookId: bigint) => {
    const k = String(bookId);
    if (!ringkas.has(k)) ringkas.set(k, { total: 0, tersedia: 0, rusak: 0, hilang: 0 });
    return ringkas.get(k)!;
  };
  for (const g of perStatus) {
    const e = entri(g.bookId);
    e.total += g._count._all;
    if (g.status === 'Tersedia') e.tersedia += g._count._all;
  }
  for (const g of perKondisi) {
    const e = entri(g.bookId);
    if (g.kondisi === 'Rusak') e.rusak += g._count._all;
    if (g.kondisi === 'Hilang') e.hilang += g._count._all;
  }

  const qs = new URLSearchParams(
    Object.entries({ tab: 'katalog', unit: String(unit.id), q, kategori }).filter(([, v]) => v) as [string, string][],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <span className="muted" style={{ fontSize: 13 }}>{total} judul di {unit.nama}</span>
        <ButtonLink href={`/perpustakaan/buku/baru`}>+ Tambah buku</ButtonLink>
      </div>

      <div className="card">
        <form method="get" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <Input type="hidden" name="tab" value="katalog" />
          <Input type="hidden" name="unit" value={unit.id} />
          <Input name="q" defaultValue={q} placeholder="Cari judul / kode / penulis / ISBN" style={{ ...gayaInput, minWidth: 240 }} />
          <Select name="kategori" defaultValue={kategori} style={gayaInput}>
            <option value="">Semua kategori</option>
            {KATEGORI_BUKU.map((k) => <option key={k} value={k}>{k}</option>)}
          </Select>
          <Button type="submit" varian="sekunder">Saring</Button>
        </form>

        {daftar.length === 0 ? <Kosong pesan="Belum ada buku yang cocok di katalog ini." /> : (
          <Tabel kolom={['Kode', 'Judul / penulis', 'Kategori', 'Rak', 'Eksemplar', { label: 'Dipinjam', num: true }, 'Aksi']}>
            {daftar.map((b) => {
              const eks = ringkas.get(String(b.id)) ?? { total: 0, tersedia: 0, rusak: 0, hilang: 0 };
              return (
              <tr key={String(b.id)}>
                <td><span style={{ fontWeight: 600 }}>{b.kode}</span></td>
                <td>
                  <div style={{ fontWeight: 600 }}>{b.judul}</div>
                  <div className="muted" style={{ fontSize: 11.5 }}>
                    {[b.penulis, b.penerbit, b.tahunTerbit ? String(b.tahunTerbit) : null].filter(Boolean).join(' · ')}
                  </div>
                </td>
                <td>{b.kategori || <span className="muted">-</span>}</td>
                <td>{b.rak || <span className="muted">-</span>}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <span style={{ fontWeight: 600 }}>{eks.tersedia} tersedia</span>
                  <span className="muted"> / {eks.total}</span>
                  {(eks.rusak > 0 || eks.hilang > 0) && (
                    <span style={{ display: 'inline-flex', gap: 4, marginLeft: 6 }}>
                      {eks.rusak > 0 && <span className="badge oranye" style={{ fontSize: 10.5 }}>{eks.rusak} rusak</span>}
                      {eks.hilang > 0 && <span className="badge merah" style={{ fontSize: 10.5 }}>{eks.hilang} hilang</span>}
                    </span>
                  )}
                </td>
                <td className="num">{b._count.loans}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <ButtonLink href={`/perpustakaan/buku/${b.id}`} varian="sekunder" style={{ fontSize: 12.5, marginRight: 6 }}>Ubah</ButtonLink>
                  <form action={hapusBuku} style={{ display: 'inline' }}>
                    <Input type="hidden" name="id" value={String(b.id)} />
                    <Input type="hidden" name="_kembali" value="/perpustakaan/katalog" />
                    <Button type="submit" varian="sekunder" style={{ fontSize: 12.5, color: 'var(--merah, #b3261e)' }}>Hapus</Button>
                  </form>
                </td>
              </tr>
              );
            })}
          </Tabel>
        )}
        <Pagination halaman={halaman} totalHalaman={totalHalaman} total={total} jumlahBaris={daftar.length} ukuranHalaman={UKURAN_HALAMAN} buatHref={(h) => `/perpustakaan?${qs.toString()}&halaman=${h}`} />
      </div>
    </div>
  );
}
