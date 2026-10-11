import Link from 'next/link';
import { KATEGORI_BUKU } from './data';
import { tambahBuku, ubahBuku } from './actions';

type Unit = { id: number; nama: string };
type Buku = {
  id: bigint;
  kode: string;
  judul: string;
  penulis: string | null;
  penerbit: string | null;
  tahunTerbit: number | null;
  isbn: string | null;
  kategori: string | null;
  rak: string | null;
  jumlah: number;
  keterangan: string | null;
} | null;

const gayaInput = { padding: '9px 11px', borderRadius: 10, border: '1px solid var(--garis)' } as const;
const gayaLabel = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600 } as const;

export function BukuForm({ unit, buku }: { unit: Unit; buku: Buku }) {
  const edit = Boolean(buku);
  return (
    <form
      action={edit ? ubahBuku : tambahBuku}
      className="card"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, maxWidth: 900 }}
    >
      {edit && <input type="hidden" name="id" value={String(buku!.id)} />}
      <input type="hidden" name="unitId" value={unit.id} />
      <input type="hidden" name="_kembali" value={`/perpustakaan?tab=katalog`} />

      <label style={gayaLabel}>Kode buku *
        <input name="kode" required defaultValue={buku?.kode ?? ''} placeholder="mis. SMP-001" style={gayaInput} />
      </label>
      <label style={{ ...gayaLabel, gridColumn: '1 / -1' }}>Judul *
        <input name="judul" required defaultValue={buku?.judul ?? ''} placeholder="Judul buku" style={gayaInput} />
      </label>
      <label style={gayaLabel}>Penulis
        <input name="penulis" defaultValue={buku?.penulis ?? ''} style={gayaInput} />
      </label>
      <label style={gayaLabel}>Penerbit
        <input name="penerbit" defaultValue={buku?.penerbit ?? ''} style={gayaInput} />
      </label>
      <label style={gayaLabel}>Tahun terbit
        <input name="tahunTerbit" inputMode="numeric" defaultValue={buku?.tahunTerbit ?? ''} placeholder="2024" style={gayaInput} />
      </label>
      <label style={gayaLabel}>ISBN
        <input name="isbn" defaultValue={buku?.isbn ?? ''} style={gayaInput} />
      </label>
      <label style={gayaLabel}>Kategori
        <select name="kategori" defaultValue={buku?.kategori ?? ''} style={gayaInput}>
          <option value="">— pilih —</option>
          {KATEGORI_BUKU.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </label>
      <label style={gayaLabel}>Rak / lokasi
        <input name="rak" defaultValue={buku?.rak ?? ''} placeholder="mis. Rak A-3" style={gayaInput} />
      </label>
      <label style={gayaLabel}>Jumlah eksemplar *
        <input name="jumlah" type="number" min={1} required defaultValue={buku?.jumlah ?? 1} style={gayaInput} />
      </label>
      <label style={{ ...gayaLabel, gridColumn: '1 / -1' }}>Keterangan
        <textarea name="keterangan" rows={3} defaultValue={buku?.keterangan ?? ''} style={gayaInput} />
      </label>

      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
        <button type="submit" className="btn">{edit ? 'Simpan perubahan' : 'Tambah buku'}</button>
        <Link href={`/perpustakaan?tab=katalog`} className="btn-sekunder">Batal</Link>
      </div>
    </form>
  );
}
