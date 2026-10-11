import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Kosong, Pagination, Tabel, UKURAN_HALAMAN, bacaHalaman, satu, type SearchParams } from '@/components';
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
  const qs = new URLSearchParams(
    Object.entries({ tab: 'katalog', unit: String(unit.id), q, kategori }).filter(([, v]) => v) as [string, string][],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <span className="muted" style={{ fontSize: 13 }}>{total} judul di {unit.nama}</span>
        <Link href={`/perpustakaan/buku/baru?unit=${unit.id}`} className="btn">+ Tambah buku</Link>
      </div>

      <div className="card">
        <form method="get" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <input type="hidden" name="tab" value="katalog" />
          <input type="hidden" name="unit" value={unit.id} />
          <input name="q" defaultValue={q} placeholder="Cari judul / kode / penulis / ISBN" style={{ ...gayaInput, minWidth: 240 }} />
          <select name="kategori" defaultValue={kategori} style={gayaInput}>
            <option value="">Semua kategori</option>
            {KATEGORI_BUKU.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <button type="submit" className="btn-sekunder">Saring</button>
        </form>

        {daftar.length === 0 ? <Kosong pesan="Belum ada buku yang cocok di katalog ini." /> : (
          <Tabel kolom={['Kode', 'Judul / penulis', 'Kategori', 'Rak', { label: 'Eksemplar', num: true }, { label: 'Dipinjam', num: true }, 'Aksi']}>
            {daftar.map((b) => (
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
                <td className="num">{b.jumlah}</td>
                <td className="num">{b._count.loans}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <Link href={`/perpustakaan/buku/${b.id}?unit=${unit.id}`} className="btn-sekunder" style={{ fontSize: 12.5, marginRight: 6 }}>Ubah</Link>
                  <form action={hapusBuku} style={{ display: 'inline' }}>
                    <input type="hidden" name="id" value={String(b.id)} />
                    <input type="hidden" name="_kembali" value={`/perpustakaan?unit=${unit.id}&tab=katalog`} />
                    <button type="submit" className="btn-sekunder" style={{ fontSize: 12.5, color: 'var(--merah, #b3261e)' }}>Hapus</button>
                  </form>
                </td>
              </tr>
            ))}
          </Tabel>
        )}
        <Pagination halaman={halaman} totalHalaman={totalHalaman} total={total} jumlahBaris={daftar.length} ukuranHalaman={UKURAN_HALAMAN} buatHref={(h) => `/perpustakaan?${qs.toString()}&halaman=${h}`} />
      </div>
    </div>
  );
}
