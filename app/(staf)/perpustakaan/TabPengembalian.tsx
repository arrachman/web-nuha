import { prisma } from '@/lib/prisma';
import { Button, FormField, Input, Kosong, Select, Tabel, rp, satu, type SearchParams } from '@/components';
import { bacaAturanPerpus, dendaProspektif, hitungHariDenda } from './data';
import { bayarDenda, kembalikanBuku } from './aksi-sirkulasi';

type Unit = { id: number; nama: string };

const gayaInput = { padding: '9px 11px', borderRadius: 10, border: '1px solid var(--garis)' } as const;
const gayaKecil = { padding: '6px 8px', borderRadius: 8, border: '1px solid var(--garis)', fontSize: 12.5 } as const;

function fmtTanggal(d: Date) {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function labelTipe(tipe: string) {
  return tipe === 'pegawai' ? 'Pegawai' : tipe === 'santri' ? 'Santri' : 'Umum';
}

export async function TabPengembalian({ unit, sp }: { unit: Unit; sp: SearchParams }) {
  const aturan = await bacaAturanPerpus(unit.id);
  const kode = (satu(sp.kode) ?? '').trim().toUpperCase();
  const sekarang = new Date();
  const hariIniIso = sekarang.toISOString().slice(0, 10);

  const [ditemukan, aktif, kembaliBerdenda] = await Promise.all([
    kode
      ? prisma.bookLoan.findFirst({
          where: { unitId: unit.id, status: 'Dipinjam', copy: { kode } },
          include: {
            book: { select: { kode: true, judul: true } },
            copy: { select: { kode: true } },
          },
        })
      : Promise.resolve(null),
    prisma.bookLoan.findMany({
      where: { unitId: unit.id, status: 'Dipinjam' },
      include: {
        book: { select: { kode: true, judul: true } },
        copy: { select: { kode: true } },
      },
      orderBy: { tanggalJatuhTempo: 'asc' },
      take: 200,
    }),
    prisma.bookLoan.findMany({
      where: { unitId: unit.id, status: 'Dikembalikan', denda: { gt: 0 } },
      include: {
        book: { select: { kode: true, judul: true } },
        copy: { select: { kode: true } },
      },
      orderBy: { tanggalKembali: 'desc' },
      take: 200,
    }),
  ]);
  const belumLunas = kembaliBerdenda.filter((l) => l.denda > l.dendaDibayar);

  const hariDendaTemuan = ditemukan ? hitungHariDenda(ditemukan.tanggalJatuhTempo, sekarang, aturan.libur) : 0;
  const dendaTemuan = ditemukan ? dendaProspektif(ditemukan.tanggalJatuhTempo, aturan, sekarang) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <h3 style={{ margin: '0 0 4px' }}>Pengembalian buku</h3>
        <p className="muted" style={{ fontSize: 13, margin: '0 0 12px' }}>
          Scan atau ketik kode eksemplar untuk menemukan pinjamannya, atau kembalikan langsung dari daftar di bawah.
          Denda dihitung otomatis: {rp(aturan.dendaPerHari)}/hari keterlambatan (Minggu &amp; hari libur tidak dihitung).
        </p>
        <form method="get" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Input type="hidden" name="tab" value="pengembalian" />
          <Input name="kode" varian="cari" defaultValue={kode} placeholder="Kode eksemplar, mis. B0001-03" autoComplete="off" style={{ minWidth: 260 }} />
          <Button type="submit">Cari eksemplar</Button>
        </form>

        {kode && !ditemukan && (
          <div style={{ marginTop: 14 }}>
            <Kosong pesan={`Tidak ada pinjaman aktif untuk kode "${kode}".`} />
          </div>
        )}

        {ditemukan && (
          <div style={{ marginTop: 14, borderTop: '1px solid var(--garis)', paddingTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{ditemukan.book.judul}</div>
                <div className="muted" style={{ fontSize: 12.5 }}>
                  Eksemplar {ditemukan.copy?.kode ?? ditemukan.book.kode} • {ditemukan.namaPeminjam} ({labelTipe(ditemukan.tipePeminjam)})
                </div>
                <div className="muted" style={{ fontSize: 12.5 }}>
                  Dipinjam {fmtTanggal(ditemukan.tanggalPinjam)} • Jatuh tempo {fmtTanggal(ditemukan.tanggalJatuhTempo)}
                </div>
              </div>
              {hariDendaTemuan > 0 ? (
                <span className="pill" style={{ background: 'var(--merah-muda, #fdecea)', color: 'var(--merah, #b3261e)' }}>
                  Terlambat {hariDendaTemuan} hari — denda {rp(dendaTemuan)}
                </span>
              ) : (
                <span className="pill">Belum terlambat</span>
              )}
            </div>
            <form action={kembalikanBuku} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 12 }}>
              <Input type="hidden" name="id" value={String(ditemukan.id)} />
              <Input type="hidden" name="_kembali" value="/perpustakaan/pengembalian" />
              <FormField label="Tanggal kembali" htmlFor="tanggalKembali" rapat>
                <Input id="tanggalKembali" type="date" name="tanggalKembali" required defaultValue={hariIniIso} style={gayaInput} />
              </FormField>
              <FormField label="Kondisi saat kembali" htmlFor="kondisiKembali" rapat>
                <Select id="kondisiKembali" name="kondisiKembali" defaultValue="Baik" style={gayaInput}>
                  <option value="Baik">Baik</option>
                  <option value="Rusak">Rusak</option>
                  <option value="Hilang">Hilang</option>
                </Select>
              </FormField>
              <Button type="submit">Catat pengembalian</Button>
            </form>
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ margin: '0 0 12px' }}>Sedang dipinjam ({aktif.length})</h3>
        {aktif.length === 0 ? <Kosong pesan="Tidak ada buku yang sedang dipinjam." /> : (
          <Tabel kolom={['Buku', 'Peminjam', 'Jatuh tempo', 'Terlambat', 'Aksi']}>
            {aktif.map((l) => {
              const hari = hitungHariDenda(l.tanggalJatuhTempo, sekarang, aturan.libur);
              const denda = dendaProspektif(l.tanggalJatuhTempo, aturan, sekarang);
              return (
                <tr key={String(l.id)}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{l.book.judul}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>{l.copy?.kode ?? l.book.kode}</div>
                  </td>
                  <td>
                    <div>{l.namaPeminjam}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>{labelTipe(l.tipePeminjam)}</div>
                  </td>
                  <td>{fmtTanggal(l.tanggalJatuhTempo)}</td>
                  <td>
                    {hari > 0 ? (
                      <span style={{ color: 'var(--merah, #b3261e)', fontWeight: 600 }}>{hari} hari • {rp(denda)}</span>
                    ) : (
                      <span className="muted">-</span>
                    )}
                  </td>
                  <td>
                    <form action={kembalikanBuku} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <Input type="hidden" name="id" value={String(l.id)} />
                      <Input type="hidden" name="tanggalKembali" value={hariIniIso} />
                      <Input type="hidden" name="_kembali" value="/perpustakaan/pengembalian" />
                      <Select name="kondisiKembali" defaultValue="Baik" style={gayaKecil} aria-label="Kondisi saat kembali">
                        <option value="Baik">Baik</option>
                        <option value="Rusak">Rusak</option>
                        <option value="Hilang">Hilang</option>
                      </Select>
                      <Button type="submit" varian="sekunder" style={{ fontSize: 12.5 }}>Kembalikan</Button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </Tabel>
        )}
      </div>

      <div className="card">
        <h3 style={{ margin: '0 0 12px' }}>Denda belum lunas ({belumLunas.length})</h3>
        {belumLunas.length === 0 ? <Kosong pesan="Tidak ada denda yang belum lunas." /> : (
          <Tabel kolom={['Peminjam', 'Buku', { label: 'Denda', num: true }, { label: 'Dibayar', num: true }, { label: 'Sisa', num: true }, 'Aksi']}>
            {belumLunas.map((l) => {
              const sisa = l.denda - l.dendaDibayar;
              return (
                <tr key={String(l.id)}>
                  <td>
                    <div>{l.namaPeminjam}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>{labelTipe(l.tipePeminjam)} • kembali {l.tanggalKembali ? fmtTanggal(l.tanggalKembali) : '-'}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{l.book.judul}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>{l.copy?.kode ?? l.book.kode}</div>
                  </td>
                  <td className="num">{rp(l.denda)}</td>
                  <td className="num">{rp(l.dendaDibayar)}</td>
                  <td className="num" style={{ fontWeight: 700, color: 'var(--merah, #b3261e)' }}>{rp(sisa)}</td>
                  <td>
                    <form action={bayarDenda} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <Input type="hidden" name="id" value={String(l.id)} />
                      <Input type="hidden" name="_kembali" value="/perpustakaan/pengembalian" />
                      <Input type="number" name="nominal" min={1} defaultValue={sisa} style={{ ...gayaKecil, width: 110 }} aria-label="Nominal pembayaran" />
                      <Button type="submit" varian="sekunder" style={{ fontSize: 12.5 }}>Catat bayar</Button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </Tabel>
        )}
      </div>
    </div>
  );
}
