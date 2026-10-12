import { prisma } from '@/lib/prisma';
import { Button, ButtonLink, FormField, Input, Kosong, Pagination, Select, Tabel, Textarea, UKURAN_HALAMAN, bacaHalaman, rp, type SearchParams } from '@/components';
import { bacaAturanPerpus, labelTerlambat, type AturanPerpus } from './data';
import { pinjamBuku } from './aksi-sirkulasi';

type Unit = { id: number; nama: string };

const gayaInput = { padding: '9px 11px', borderRadius: 10, border: '1px solid var(--garis)' } as const;

function fmtTanggal(d: Date) {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export async function TabPeminjaman({ unit, sp }: { unit: Unit; sp: SearchParams }) {
  const aturan = await bacaAturanPerpus(unit.id);
  const halaman = bacaHalaman(sp);

  const where = { unitId: unit.id, status: 'Dipinjam' };
  const [total, daftar] = await Promise.all([
    prisma.bookLoan.count({ where }),
    prisma.bookLoan.findMany({
      where,
      include: {
        book: { select: { kode: true, judul: true } },
        copy: { select: { kode: true } },
      },
      orderBy: { tanggalPinjam: 'desc' },
      skip: (halaman - 1) * UKURAN_HALAMAN,
      take: UKURAN_HALAMAN,
    }),
  ]);
  const totalHalaman = Math.max(1, Math.ceil(total / UKURAN_HALAMAN));
  const sekarang = new Date();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <h3 style={{ margin: '0 0 4px' }}>Catat peminjaman baru</h3>
        <p className="muted" style={{ fontSize: 13, margin: '0 0 12px' }}>
          Aturan: maks. {aturan.maksBuku} buku • lama pinjam {aturan.lamaPinjam} hari • denda {rp(aturan.dendaPerHari)}/hari.
          Scan kode eksemplar atau pilih dari daftar di form berikut.
        </p>
        <PinjamForm unitId={unit.id} aturan={aturan} />
      </div>

      <div className="card">
        <h3 style={{ margin: '0 0 12px' }}>Sedang dipinjam ({total})</h3>
        {daftar.length === 0 ? <Kosong pesan="Tidak ada buku yang sedang dipinjam." /> : (
          <Tabel kolom={['Buku', 'Peminjam', 'Tgl pinjam', 'Jatuh tempo', 'Status', 'Aksi']}>
            {daftar.map((l) => {
              const terlambat = new Date(l.tanggalJatuhTempo) < sekarang;
              return (
                <tr key={String(l.id)}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{l.book.judul}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>{l.copy?.kode ?? l.book.kode}</div>
                  </td>
                  <td>
                    <div>{l.namaPeminjam}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>{l.tipePeminjam === 'pegawai' ? 'Pegawai' : l.tipePeminjam === 'santri' ? 'Santri' : 'Umum'}</div>
                  </td>
                  <td>{fmtTanggal(l.tanggalPinjam)}</td>
                  <td>{fmtTanggal(l.tanggalJatuhTempo)}</td>
                  <td>
                    {terlambat ? (
                      <span className="pill" style={{ background: 'var(--merah-muda, #fdecea)', color: 'var(--merah, #b3261e)' }}>{labelTerlambat(l.tanggalJatuhTempo)}</span>
                    ) : (
                      <span className="pill">Dipinjam</span>
                    )}
                  </td>
                  <td>
                    <ButtonLink
                      varian="sekunder"
                      style={{ fontSize: 12.5 }}
                      href={l.copy ? `/perpustakaan/pengembalian?kode=${encodeURIComponent(l.copy.kode)}` : '/perpustakaan?tab=pengembalian'}
                    >
                      Kembalikan
                    </ButtonLink>
                  </td>
                </tr>
              );
            })}
          </Tabel>
        )}
        <Pagination halaman={halaman} totalHalaman={totalHalaman} total={total} jumlahBaris={daftar.length} ukuranHalaman={UKURAN_HALAMAN} buatHref={(h) => `/perpustakaan?tab=peminjaman&halaman=${h}`} />
      </div>
    </div>
  );
}

async function PinjamForm({ unitId, aturan }: { unitId: number; aturan: AturanPerpus }) {
  const [eksemplar, santri, pegawai] = await Promise.all([
    prisma.bookCopy.findMany({
      where: { unitId, status: 'Tersedia', kondisi: { not: 'Hilang' } },
      select: { id: true, kode: true, kondisi: true, book: { select: { kode: true, judul: true } } },
      orderBy: [{ book: { judul: 'asc' } }, { kode: 'asc' }],
      take: 2000,
    }),
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

  // Kelompokkan eksemplar per buku untuk <optgroup> (urutan judul dari query).
  const grupBuku: { label: string; salinan: typeof eksemplar }[] = [];
  for (const e of eksemplar) {
    const label = `${e.book.kode} — ${e.book.judul}`;
    const grup = grupBuku.find((g) => g.label === label);
    if (grup) grup.salinan.push(e);
    else grupBuku.push({ label, salinan: [e] });
  }

  const hariIni = new Date().toISOString().slice(0, 10);
  const jatuhTempo = new Date(Date.now() + aturan.lamaPinjam * 86400000).toISOString().slice(0, 10);

  return (
    <form action={pinjamBuku} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
      <Input type="hidden" name="unitId" value={unitId} />
      <Input type="hidden" name="_kembali" value="/perpustakaan/peminjaman" />
      <FormField label="Kode eksemplar (scan / ketik)" htmlFor="kodeEksemplar" petunjuk="atau pilih dari daftar di bawah" style={{ gridColumn: '1 / -1' }}>
        <>
          <Input id="kodeEksemplar" name="kodeEksemplar" list="daftar-eksemplar" autoComplete="off" placeholder="mis. B0001-03" style={gayaInput} />
          <datalist id="daftar-eksemplar">
            {eksemplar.map((e) => (
              <option key={String(e.id)} value={e.kode}>{e.kode} — {e.book.judul} ({e.kondisi})</option>
            ))}
          </datalist>
        </>
      </FormField>
      <FormField label="Eksemplar" htmlFor="copyId">
        <Select id="copyId" name="copyId" style={gayaInput}>
          <option value="">— pilih eksemplar —</option>
          {grupBuku.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.salinan.map((e) => (
                <option key={String(e.id)} value={String(e.id)}>{e.kode} — {e.kondisi}</option>
              ))}
            </optgroup>
          ))}
        </Select>
      </FormField>
      <FormField label="Tipe peminjam" htmlFor="tipePeminjam">
        <Select id="tipePeminjam" name="tipePeminjam" required defaultValue="santri" style={gayaInput}>
          <option value="santri">Santri</option>
          <option value="pegawai">Pegawai / Guru</option>
          <option value="umum">Umum</option>
        </Select>
      </FormField>
      <FormField label="Santri (bila tipe santri)" htmlFor="santriId">
        <Select id="santriId" name="santriId" style={gayaInput}>
          <option value="">— pilih santri —</option>
          {santri.map((s) => <option key={String(s.id)} value={String(s.id)}>{s.person.fullName}</option>)}
        </Select>
      </FormField>
      <FormField label="Pegawai (bila tipe pegawai)" htmlFor="staffId">
        <Select id="staffId" name="staffId" style={gayaInput}>
          <option value="">— pilih pegawai —</option>
          {pegawai.map((s) => <option key={String(s.id)} value={String(s.id)}>{s.person.fullName}</option>)}
        </Select>
      </FormField>
      <FormField label="Nama peminjam umum" htmlFor="namaPeminjam">
        <Input id="namaPeminjam" name="namaPeminjam" placeholder="Isi bila tipe Umum" style={gayaInput} />
      </FormField>
      <FormField label="Tanggal pinjam" htmlFor="tanggalPinjam">
        <Input id="tanggalPinjam" type="date" name="tanggalPinjam" required defaultValue={hariIni} style={gayaInput} />
      </FormField>
      <FormField label="Jatuh tempo" htmlFor="tanggalJatuhTempo">
        <Input id="tanggalJatuhTempo" type="date" name="tanggalJatuhTempo" required defaultValue={jatuhTempo} style={gayaInput} />
      </FormField>
      <FormField label="Catatan" htmlFor="catatan">
        <Textarea id="catatan" name="catatan" rows={2} placeholder="Opsional" style={gayaInput} />
      </FormField>
      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
        <Button type="submit">Catat peminjaman</Button>
      </div>
    </form>
  );
}
