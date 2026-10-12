import { Button, Card, FormField, Input, Textarea } from '@/components';
import { bacaAturanPerpus } from './data';
import { simpanAturanPerpus } from './actions';

type Unit = { id: number; nama: string };

const gayaInput = { padding: '9px 11px', borderRadius: 10, border: '1px solid var(--garis)' } as const;

/** Aturan sirkulasi per unit: lama pinjam, maks. buku, denda per hari, perpanjangan, hari libur. */
export async function TabPengaturan({ unit }: { unit: Unit }) {
  const aturan = await bacaAturanPerpus(unit.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card judul={`Aturan peminjaman & denda — ${unit.nama}`} sub="Aturan ini dipakai langsung oleh form peminjaman, pengembalian, dan perpanjangan unit ini.">
        <form action={simpanAturanPerpus} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          <Input type="hidden" name="unitId" value={unit.id} />
          <Input type="hidden" name="_kembali" value="/perpustakaan/pengaturan" />
          <FormField label="Lama pinjam (hari)" htmlFor="lamaPinjam">
            <Input id="lamaPinjam" type="number" name="lamaPinjam" min={1} required defaultValue={aturan.lamaPinjam} style={gayaInput} />
          </FormField>
          <FormField label="Maks. buku per anggota" htmlFor="maksBuku">
            <Input id="maksBuku" type="number" name="maksBuku" min={1} required defaultValue={aturan.maksBuku} style={gayaInput} />
          </FormField>
          <FormField label="Denda per hari (Rp)" htmlFor="dendaPerHari">
            <Input id="dendaPerHari" type="number" name="dendaPerHari" min={0} required defaultValue={aturan.dendaPerHari} style={gayaInput} />
          </FormField>
          <FormField label="Maks. perpanjangan (kali)" htmlFor="maksPerpanjang">
            <Input id="maksPerpanjang" type="number" name="maksPerpanjang" min={1} required defaultValue={aturan.maksPerpanjang} style={gayaInput} />
          </FormField>
          <div style={{ gridColumn: '1 / -1' }}>
            <FormField
              label="Hari libur & tanggal merah (bebas denda)"
              htmlFor="libur"
              petunjuk="Satu tanggal per baris, format YYYY-MM-DD. Hari Minggu otomatis tidak dihitung denda."
            >
              <Textarea id="libur" name="libur" rows={5} defaultValue={aturan.libur.join('\n')} placeholder={'2026-12-25\n2027-01-01'} style={gayaInput} />
            </FormField>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Button type="submit">Simpan aturan</Button>
          </div>
        </form>
      </Card>

      <Card judul="Cara aturan dipakai">
        <div className="muted" style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ margin: 0 }}><strong>Lama pinjam</strong> menentukan tanggal jatuh tempo bawaan saat peminjaman dicatat.</p>
          <p style={{ margin: 0 }}><strong>Maks. buku</strong> membatasi jumlah pinjaman aktif seorang anggota pada satu waktu.</p>
          <p style={{ margin: 0 }}><strong>Denda per hari</strong> dihitung dari hari keterlambatan di luar hari Minggu dan tanggal libur di atas, lalu dibekukan sebagai denda final saat buku dikembalikan. Kekurangan bayar tampil sebagai sisa denda di tab Anggota &amp; Laporan.</p>
          <p style={{ margin: 0 }}><strong>Maks. perpanjangan</strong> membatasi berapa kali satu peminjaman boleh diperpanjang; setiap perpanjangan menambah jatuh tempo sebesar lama pinjam.</p>
        </div>
      </Card>
    </div>
  );
}
