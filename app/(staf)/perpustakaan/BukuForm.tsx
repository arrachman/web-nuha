import { Button, ButtonLink, FormField, Input, Select, Textarea } from '@/components';
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

export function BukuForm({ unit, buku }: { unit: Unit; buku: Buku }) {
  const edit = Boolean(buku);
  return (
    <form
      action={edit ? ubahBuku : tambahBuku}
      className="card"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, maxWidth: 900 }}
    >
      {edit && <Input type="hidden" name="id" value={String(buku!.id)} />}
      <Input type="hidden" name="unitId" value={unit.id} />
      <Input type="hidden" name="_kembali" value="/perpustakaan/katalog" />

      <FormField label="Kode buku *" htmlFor="kode">
        <Input id="kode" name="kode" required defaultValue={buku?.kode ?? ''} placeholder="mis. SMP-001" style={gayaInput} />
      </FormField>
      <FormField label="Judul *" htmlFor="judul" style={{ gridColumn: '1 / -1' }}>
        <Input id="judul" name="judul" required defaultValue={buku?.judul ?? ''} placeholder="Judul buku" style={gayaInput} />
      </FormField>
      <FormField label="Penulis" htmlFor="penulis">
        <Input id="penulis" name="penulis" defaultValue={buku?.penulis ?? ''} style={gayaInput} />
      </FormField>
      <FormField label="Penerbit" htmlFor="penerbit">
        <Input id="penerbit" name="penerbit" defaultValue={buku?.penerbit ?? ''} style={gayaInput} />
      </FormField>
      <FormField label="Tahun terbit" htmlFor="tahunTerbit">
        <Input id="tahunTerbit" name="tahunTerbit" inputMode="numeric" defaultValue={buku?.tahunTerbit ?? ''} placeholder="2024" style={gayaInput} />
      </FormField>
      <FormField label="ISBN" htmlFor="isbn">
        <Input id="isbn" name="isbn" defaultValue={buku?.isbn ?? ''} style={gayaInput} />
      </FormField>
      <FormField label="Kategori" htmlFor="kategori">
        <Select id="kategori" name="kategori" defaultValue={buku?.kategori ?? ''} style={gayaInput}>
          <option value="">— pilih —</option>
          {KATEGORI_BUKU.map((k) => <option key={k} value={k}>{k}</option>)}
        </Select>
      </FormField>
      <FormField label="Rak / lokasi" htmlFor="rak">
        <Input id="rak" name="rak" defaultValue={buku?.rak ?? ''} placeholder="mis. Rak A-3" style={gayaInput} />
      </FormField>
      <FormField label="Jumlah eksemplar *" htmlFor="jumlah">
        <Input id="jumlah" name="jumlah" type="number" min={1} required defaultValue={buku?.jumlah ?? 1} style={gayaInput} />
      </FormField>
      <FormField label="Keterangan" htmlFor="keterangan" style={{ gridColumn: '1 / -1' }}>
        <Textarea id="keterangan" name="keterangan" rows={3} defaultValue={buku?.keterangan ?? ''} style={gayaInput} />
      </FormField>

      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
        <Button type="submit">{edit ? 'Simpan perubahan' : 'Tambah buku'}</Button>
        <ButtonLink varian="sekunder" href="/perpustakaan/katalog">Batal</ButtonLink>
      </div>
    </form>
  );
}
