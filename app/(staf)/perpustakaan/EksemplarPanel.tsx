import { prisma } from '@/lib/prisma';
import { Button, Input, Kosong, Select, Tabel } from '@/components';
import { KONDISI_EKSEMPLAR } from './data';
import { tambahEksemplar, ubahEksemplar, hapusEksemplar } from './actions';

type Buku = { id: bigint; kode: string; judul: string };

const gayaInput = { padding: '9px 11px', borderRadius: 10, border: '1px solid var(--garis)' } as const;

const badgeStatus: Record<string, string> = {
  Tersedia: 'badge hijau',
  Dipinjam: 'badge kuning',
  Hilang: 'badge merah',
};

/** Panel kelola eksemplar (satuan fisik) sebuah buku: tambah, ubah kondisi, hapus. */
export async function EksemplarPanel({ buku }: { buku: Buku }) {
  const copies = await prisma.bookCopy.findMany({
    where: { bookId: buku.id },
    orderBy: { kode: 'asc' },
    select: { id: true, kode: true, kondisi: true, status: true },
  });
  const kembali = `/perpustakaan/buku/${buku.id}`;
  const tersedia = copies.filter((c) => c.status === 'Tersedia').length;

  return (
    <div className="card" style={{ maxWidth: 900, marginTop: 16 }}>
      <h3 className="card-judul">Eksemplar — {buku.kode}</h3>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
        {copies.length} eksemplar fisik untuk “{buku.judul}” · {tersedia} tersedia.
        Kode eksemplar dibuat otomatis berurutan dari kode buku.
      </p>

      <form action={tambahEksemplar} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', margin: '12px 0 14px' }}>
        <Input type="hidden" name="id" value={String(buku.id)} />
        <Input type="hidden" name="_kembali" value={kembali} />
        <Input type="number" name="jumlah" min={1} defaultValue={1} aria-label="Jumlah eksemplar baru" style={{ ...gayaInput, width: 90 }} />
        <Button type="submit" varian="sekunder">+ Tambah eksemplar</Button>
      </form>

      {copies.length === 0 ? (
        <Kosong pesan="Belum ada eksemplar untuk buku ini." />
      ) : (
        <Tabel kolom={['Kode', 'Kondisi', 'Status', 'Aksi']}>
          {copies.map((c) => {
            const dipinjam = c.status === 'Dipinjam';
            return (
              <tr key={String(c.id)}>
                <td><span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{c.kode}</span></td>
                <td>
                  <form action={ubahEksemplar} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Input type="hidden" name="id" value={String(c.id)} />
                    <Input type="hidden" name="_kembali" value={kembali} />
                    <Select name="kondisi" defaultValue={c.kondisi} disabled={dipinjam} aria-label={`Kondisi ${c.kode}`} style={gayaInput}>
                      {KONDISI_EKSEMPLAR.map((k) => <option key={k} value={k}>{k}</option>)}
                    </Select>
                    <Button type="submit" varian="sekunder" disabled={dipinjam} style={{ fontSize: 12.5 }}>Simpan</Button>
                  </form>
                </td>
                <td>
                  <span className={badgeStatus[c.status] ?? 'badge netral'}>{c.status}</span>
                  {dipinjam && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>Kembalikan dulu untuk mengubah / menghapus.</div>}
                </td>
                <td>
                  <form action={hapusEksemplar} style={{ display: 'inline' }}>
                    <Input type="hidden" name="id" value={String(c.id)} />
                    <Input type="hidden" name="_kembali" value={kembali} />
                    <Button type="submit" varian="sekunder" disabled={dipinjam} style={{ fontSize: 12.5, color: 'var(--merah, #b3261e)' }}>Hapus</Button>
                  </form>
                </td>
              </tr>
            );
          })}
        </Tabel>
      )}
    </div>
  );
}
