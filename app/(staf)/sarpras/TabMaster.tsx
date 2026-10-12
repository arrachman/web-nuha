import { prisma } from '@/lib/prisma';
import type { SessionPayload } from '@/lib/auth';
import type { IzinSarpras } from '@/lib/aset/akses';
import { bacaAngkaSetting } from '@/lib/aset/persetujuan';
import { AMBANG_KAPITALISASI_BAWAAN, AMBANG_PENGADAAN_BAWAAN, SETTING_AMBANG_KAPITALISASI, SETTING_AMBANG_PENGADAAN, rupiah } from '@/lib/aset/konstanta';
import { getUnitAktif, whereUnitAktif } from '@/lib/unit-scope';
import { Button, FormField, Input, Select, Tabel } from '@/components';
import { mutasiPersediaan, simpanAmbang, simpanKategori, simpanSumberDana, simpanVendor, tambahPersediaan } from './actions';
import { Kembali } from './Kembali';
import { unitDalamCakupan } from './data';

const K = '/sarpras?tab=master';
const gaya = { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--garis)' } as const;

/** Master: kategori (golongan KIB), sumber dana, vendor, ambang persetujuan, barang habis pakai (C2). */
export async function TabMaster({ session, izin }: { session: SessionPayload; izin: IzinSarpras }) {
  const unitAktif = await getUnitAktif(session);
  const [kategori, dana, vendor, ambangPengadaan, ambangKapitalisasi, persediaan, units] = await Promise.all([
    prisma.assetCategory.findMany({ orderBy: { code: 'asc' }, include: { _count: { select: { assets: true } } } }),
    prisma.fundingSource.findMany({ orderBy: { id: 'asc' } }),
    prisma.vendor.findMany({ orderBy: { name: 'asc' } }),
    bacaAngkaSetting(SETTING_AMBANG_PENGADAAN, AMBANG_PENGADAAN_BAWAAN),
    bacaAngkaSetting(SETTING_AMBANG_KAPITALISASI, AMBANG_KAPITALISASI_BAWAAN),
    prisma.consumableItem.findMany({ where: whereUnitAktif(session, unitAktif), orderBy: { name: 'asc' } }),
    unitDalamCakupan(session),
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {izin.asset_manage && (
        <div className="card">
          <h3 className="card-judul">Barang habis pakai</h3>
          <Tabel kolom={['Barang', { label: 'Stok', num: true }, { label: 'Min', num: true }, 'Gudang', 'Mutasi stok']}>
            {persediaan.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td className="num" style={{ color: p.stock <= p.minStock ? '#B91C1C' : undefined, fontWeight: 700 }}>{p.stock} {p.unitOfMeasure}</td>
                <td className="num">{p.minStock}</td><td>{p.storage ?? '-'}</td>
                <td>
                  <form action={mutasiPersediaan} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Kembali ke={K} /><Input type="hidden" name="itemId" value={p.id} />
                    <Select name="direction" style={gaya}><option>Masuk</option><option>Keluar</option></Select>
                    <Input name="quantity" type="number" min={1} required placeholder="Jml" style={{ ...gaya, width: 70 }} />
                    <Input name="purpose" placeholder="Keperluan" style={{ ...gaya, width: 130 }} />
                    <Button type="submit" varian="sekunder" style={{ fontSize: 12 }}>Catat</Button>
                  </form>
                </td>
              </tr>
            ))}
          </Tabel>
          <form action={tambahPersediaan} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <Kembali ke={K} />
            <Input name="name" required placeholder="Nama barang" style={gaya} />
            <Input name="unitOfMeasure" required placeholder="Satuan" style={{ ...gaya, width: 90 }} />
            <Input name="stock" type="number" min={0} placeholder="Stok awal" style={{ ...gaya, width: 100 }} />
            <Input name="minStock" type="number" min={0} placeholder="Stok min" style={{ ...gaya, width: 100 }} />
            <Select name="unitId" style={gaya}>{units.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}</Select>
            <Input name="storage" placeholder="Gudang" style={gaya} />
            <Button type="submit" varian="sekunder">Tambah barang</Button>
          </form>
        </div>
      )}

      {izin.master_manage && (
        <>
          <div className="card">
            <h3 className="card-judul">Ambang persetujuan</h3>
            <form action={simpanAmbang} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
              <Kembali ke={K} />
              <FormField label="Pengadaan butuh ketua yayasan bila > (Rp)" htmlFor="ambangPengadaan" rapat><Input id="ambangPengadaan" name="ambangPengadaan" type="number" min={0} defaultValue={ambangPengadaan} /></FormField>
              <FormField label="Ambang kapitalisasi per unit (Rp)" htmlFor="ambangKapitalisasi" rapat><Input id="ambangKapitalisasi" name="ambangKapitalisasi" type="number" min={0} defaultValue={ambangKapitalisasi} /></FormField>
              <Button type="submit">Simpan ambang</Button>
            </form>
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Saat ini: {rupiah(ambangPengadaan)} · kapitalisasi {rupiah(ambangKapitalisasi)} (di bawahnya barang dicatat kolektif).</p>
          </div>

          <div className="card">
            <h3 className="card-judul">Kategori aset (golongan KIB)</h3>
            <Tabel kolom={['Kode', 'Nama', 'KIB', { label: 'Umur (thn)', num: true }, 'Sifat', { label: 'Aset', num: true }]}>
              {kategori.map((k) => (
                <tr key={k.id}><td>{k.code}</td><td>{k.name}</td><td>{k.kibGroup}</td><td className="num">{k.usefulLifeYears ?? '-'}</td>
                  <td>{[k.needsMaintenance && 'perlu servis', k.isConsumable && 'habis pakai'].filter(Boolean).join(', ') || '-'}</td><td className="num">{k._count.assets}</td></tr>
              ))}
            </Tabel>
            <form action={simpanKategori} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}>
              <Kembali ke={K} />
              <Input name="code" required placeholder="Kode (B.02.04)" style={{ ...gaya, width: 130 }} />
              <Input name="name" required placeholder="Nama kategori" style={gaya} />
              <Select name="kibGroup" style={gaya}>{['A', 'B', 'C', 'D', 'E', 'F'].map((g) => <option key={g}>{g}</option>)}</Select>
              <Input name="usefulLifeYears" type="number" min={0} placeholder="Umur (thn)" style={{ ...gaya, width: 100 }} />
              <label style={{ fontSize: 12.5 }}><Input type="checkbox" name="needsMaintenance" /> perlu servis</label>
              <label style={{ fontSize: 12.5 }}><Input type="checkbox" name="isConsumable" /> habis pakai</label>
              <Button type="submit" varian="sekunder">Simpan kategori</Button>
            </form>
          </div>

          <section className="grid g2">
            <div className="card">
              <h3 className="card-judul">Sumber dana</h3>
              <Tabel kolom={['Kode', 'Nama', 'Penghapusan']}>
                {dana.map((d) => <tr key={d.id}><td>{d.code}</td><td>{d.name}</td><td>{d.restrictedDisposal ? <span className="badge badge-oranye">Jalur khusus</span> : 'Biasa'}</td></tr>)}
              </Tabel>
              <form action={simpanSumberDana} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}>
                <Kembali ke={K} />
                <Input name="code" required placeholder="KODE" style={{ ...gaya, width: 120 }} />
                <Input name="name" required placeholder="Nama" style={gaya} />
                <label style={{ fontSize: 12.5 }}><Input type="checkbox" name="restrictedDisposal" /> penghapusan jalur khusus</label>
                <Button type="submit" varian="sekunder">Simpan</Button>
              </form>
            </div>
            <div className="card">
              <h3 className="card-judul">Vendor</h3>
              <Tabel kolom={['Nama', 'Telepon', 'Alamat']}>
                {vendor.map((v) => <tr key={v.id}><td>{v.name}</td><td>{v.phone ?? '-'}</td><td>{v.address ?? '-'}</td></tr>)}
              </Tabel>
              <form action={simpanVendor} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <Kembali ke={K} />
                <Input name="name" required placeholder="Nama vendor" style={gaya} />
                <Input name="phone" placeholder="Telepon" style={{ ...gaya, width: 130 }} />
                <Input name="address" placeholder="Alamat" style={gaya} />
                <Button type="submit" varian="sekunder">Tambah vendor</Button>
              </form>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
