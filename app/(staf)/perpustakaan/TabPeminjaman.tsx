import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Kosong, Pagination, Tabel, UKURAN_HALAMAN, bacaHalaman, satu, type SearchParams } from '@/components';
import { labelTerlambat } from './data';
import { kembalikanBuku, pinjamBuku } from './actions';

type Unit = { id: number; nama: string };

const gayaInput = { padding: '9px 11px', borderRadius: 10, border: '1px solid var(--garis)' } as const;

function fmtTanggal(d: Date) {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export async function TabPeminjaman({ unit, sp }: { unit: Unit; sp: SearchParams }) {
  const q = satu(sp.q);
  const status = satu(sp.status) || 'Dipinjam';
  const halaman = bacaHalaman(sp);

  const where = {
    unitId: unit.id,
    status,
    ...(q ? { OR: [{ namaPeminjam: { contains: q } }, { book: { judul: { contains: q } } }, { book: { kode: { contains: q } } }] } : {}),
  };
  const [total, daftar] = await Promise.all([
    prisma.bookLoan.count({ where }),
    prisma.bookLoan.findMany({
      where,
      include: { book: { select: { kode: true, judul: true } } },
      orderBy: { tanggalPinjam: 'desc' },
      skip: (halaman - 1) * UKURAN_HALAMAN,
      take: UKURAN_HALAMAN,
    }),
  ]);
  const totalHalaman = Math.max(1, Math.ceil(total / UKURAN_HALAMAN));
  const qs = new URLSearchParams(
    Object.entries({ tab: 'peminjaman', unit: String(unit.id), q, status }).filter(([, v]) => v) as [string, string][],
  );
  const sekarang = new Date();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <h3 style={{ margin: '0 0 4px' }}>Catat peminjaman baru</h3>
        <p className="muted" style={{ fontSize: 13, margin: '0 0 12px' }}>
          Pilih buku dari katalog <Link href={`/perpustakaan?unit=${unit.id}&tab=katalog`}>di sini</Link>, lalu isi form di bawah.
        </p>
        <PinjamForm unitId={unit.id} />
      </div>

      <div className="card">
        <form method="get" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <input type="hidden" name="tab" value="peminjaman" />
          <input type="hidden" name="unit" value={unit.id} />
          <input name="q" defaultValue={q} placeholder="Cari peminjam / judul / kode" style={{ ...gayaInput, minWidth: 240 }} />
          <select name="status" defaultValue={status} style={gayaInput}>
            <option value="Dipinjam">Sedang dipinjam</option>
            <option value="Dikembalikan">Sudah dikembalikan</option>
          </select>
          <button type="submit" className="btn-sekunder">Saring</button>
        </form>

        {daftar.length === 0 ? <Kosong pesan={status === 'Dipinjam' ? 'Tidak ada buku yang sedang dipinjam.' : 'Belum ada riwayat pengembalian.'} /> : (
          <Tabel kolom={['Buku', 'Peminjam', 'Tgl pinjam', 'Jatuh tempo', 'Status', 'Aksi']}>
            {daftar.map((l) => {
              const terlambat = l.status === 'Dipinjam' && new Date(l.tanggalJatuhTempo) < sekarang;
              return (
                <tr key={String(l.id)}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{l.book.judul}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>{l.book.kode}</div>
                  </td>
                  <td>
                    <div>{l.namaPeminjam}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>{l.tipePeminjam === 'pegawai' ? 'Pegawai' : l.tipePeminjam === 'santri' ? 'Santri' : 'Umum'}</div>
                  </td>
                  <td>{fmtTanggal(l.tanggalPinjam)}</td>
                  <td>{fmtTanggal(l.tanggalJatuhTempo)}</td>
                  <td>
                    {l.status === 'Dikembalikan' ? (
                      <span className="pill">Dikembalikan {l.tanggalKembali ? fmtTanggal(l.tanggalKembali) : ''}</span>
                    ) : terlambat ? (
                      <span className="pill" style={{ background: 'var(--merah-muda, #fdecea)', color: 'var(--merah, #b3261e)' }}>{labelTerlambat(l.tanggalJatuhTempo)}</span>
                    ) : (
                      <span className="pill">Dipinjam</span>
                    )}
                  </td>
                  <td>
                    {l.status === 'Dipinjam' && (
                      <form action={kembalikanBuku} style={{ display: 'inline' }}>
                        <input type="hidden" name="id" value={String(l.id)} />
                        <input type="hidden" name="tanggalKembali" value={new Date().toISOString().slice(0, 10)} />
                        <input type="hidden" name="_kembali" value={`/perpustakaan?unit=${unit.id}&tab=peminjaman`} />
                        <button type="submit" className="btn-sekunder" style={{ fontSize: 12.5 }}>Kembalikan</button>
                      </form>
                    )}
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

async function PinjamForm({ unitId }: { unitId: number }) {
  const buku = await prisma.book.findMany({
    where: { unitId },
    select: { id: true, kode: true, judul: true, jumlah: true },
    orderBy: { judul: 'asc' },
  });
  const [santri, pegawai] = await Promise.all([
    prisma.santri.findMany({
      where: { unitId, status: 'Aktif' },
      select: { id: true, person: { select: { fullName: true } } },
      orderBy: { person: { fullName: 'asc' } },
      take: 500,
    }),
    prisma.staff.findMany({
      where: { OR: [{ unitId }, { unitId: null }] },
      select: { id: true, person: { select: { fullName: true } } },
      orderBy: { person: { fullName: 'asc' } },
      take: 500,
    }),
  ]);
  const hariIni = new Date().toISOString().slice(0, 10);
  const duaMinggu = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

  return (
    <form action={pinjamBuku} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
      <input type="hidden" name="_kembali" value={`/perpustakaan?unit=${unitId}&tab=peminjaman`} />
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
        Buku
        <select name="bookId" required style={gayaInput}>
          <option value="">— pilih buku —</option>
          {buku.map((b) => <option key={String(b.id)} value={String(b.id)}>{b.kode} — {b.judul} ({b.jumlah} eks.)</option>)}
        </select>
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
        Tipe peminjam
        <select name="tipePeminjam" required defaultValue="santri" style={gayaInput}>
          <option value="santri">Santri</option>
          <option value="pegawai">Pegawai / Guru</option>
          <option value="umum">Umum</option>
        </select>
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
        Santri (bila tipe santri)
        <select name="santriId" style={gayaInput}>
          <option value="">— pilih santri —</option>
          {santri.map((s) => <option key={String(s.id)} value={String(s.id)}>{s.person.fullName}</option>)}
        </select>
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
        Pegawai (bila tipe pegawai)
        <select name="staffId" style={gayaInput}>
          <option value="">— pilih pegawai —</option>
          {pegawai.map((s) => <option key={String(s.id)} value={String(s.id)}>{s.person.fullName}</option>)}
        </select>
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
        Nama peminjam umum
        <input name="namaPeminjam" placeholder="Isi bila tipe Umum" style={gayaInput} />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
        Tanggal pinjam
        <input type="date" name="tanggalPinjam" required defaultValue={hariIni} style={gayaInput} />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
        Jatuh tempo
        <input type="date" name="tanggalJatuhTempo" required defaultValue={duaMinggu} style={gayaInput} />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
        Catatan
        <input name="catatan" placeholder="Opsional" style={gayaInput} />
      </label>
      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
        <button type="submit" className="btn">Catat peminjaman</button>
      </div>
    </form>
  );
}
