import { prisma } from '@/lib/prisma';
import { Button, Input, Kosong, Tabel, type SearchParams } from '@/components';
import { bacaAturanPerpus, labelTerlambat } from './data';
import { perpanjangBuku } from './aksi-sirkulasi';

type Unit = { id: number; nama: string };

function fmtTanggal(d: Date) {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function labelTipe(tipe: string) {
  return tipe === 'pegawai' ? 'Pegawai' : tipe === 'santri' ? 'Santri' : 'Umum';
}

export async function TabPerpanjangan({ unit, sp }: { unit: Unit; sp: SearchParams }) {
  void sp;
  const aturan = await bacaAturanPerpus(unit.id);
  const daftar = await prisma.bookLoan.findMany({
    where: { unitId: unit.id, status: 'Dipinjam' },
    include: {
      book: { select: { kode: true, judul: true } },
      copy: { select: { kode: true } },
    },
    orderBy: { tanggalJatuhTempo: 'asc' },
    take: 200,
  });

  const hariIni = new Date();
  hariIni.setHours(0, 0, 0, 0);
  // Sama dengan hitungan di aksi perpanjangBuku: basis = jatuh tempo atau
  // hari ini (mana yang lebih akhir), lalu tambah lama pinjam aturan.
  const tempoBaru = (jatuhTempo: Date) => {
    const tempo = new Date(jatuhTempo);
    tempo.setHours(0, 0, 0, 0);
    const basis = tempo > hariIni ? tempo : hariIni;
    const baru = new Date(basis);
    baru.setDate(baru.getDate() + aturan.lamaPinjam);
    return baru;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <h3 style={{ margin: '0 0 4px' }}>Perpanjangan peminjaman</h3>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          Jatuh tempo baru dihitung dari jatuh tempo sekarang — atau dari hari ini bila buku sudah terlambat —
          ditambah {aturan.lamaPinjam} hari. Setiap peminjaman dapat diperpanjang maks. {aturan.maksPerpanjang} kali;
          setelah itu buku harus dikembalikan. Perpanjangan tidak menghapus denda yang sudah berjalan.
        </p>
      </div>

      <div className="card">
        {daftar.length === 0 ? <Kosong pesan="Tidak ada buku yang sedang dipinjam." /> : (
          <Tabel kolom={['Buku', 'Peminjam', 'Jatuh tempo sekarang', 'Perpanjangan', 'Jatuh tempo baru', 'Aksi']}>
            {daftar.map((l) => {
              const bisa = l.jumlahPerpanjang < aturan.maksPerpanjang;
              const terlambat = new Date(l.tanggalJatuhTempo) < hariIni;
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
                  <td>
                    <div>{fmtTanggal(l.tanggalJatuhTempo)}</div>
                    {terlambat && (
                      <div style={{ fontSize: 11.5, color: 'var(--merah, #b3261e)', fontWeight: 600 }}>{labelTerlambat(l.tanggalJatuhTempo)}</div>
                    )}
                  </td>
                  <td>{l.jumlahPerpanjang} dari maks. {aturan.maksPerpanjang} kali</td>
                  <td>{bisa ? <span style={{ fontWeight: 600 }}>{fmtTanggal(tempoBaru(l.tanggalJatuhTempo))}</span> : <span className="muted">-</span>}</td>
                  <td>
                    <form action={perpanjangBuku} style={{ display: 'inline' }}>
                      <Input type="hidden" name="id" value={String(l.id)} />
                      <Input type="hidden" name="_kembali" value="/perpustakaan/perpanjangan" />
                      <Button type="submit" varian="sekunder" style={{ fontSize: 12.5 }} disabled={!bisa}>
                        Perpanjang
                      </Button>
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
