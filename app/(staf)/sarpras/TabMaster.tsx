import { prisma } from '@/lib/prisma';
import type { SessionPayload } from '@/lib/auth';
import type { IzinSarpras } from '@/lib/aset/akses';
import { bacaAngkaSetting } from '@/lib/aset/persetujuan';
import { AMBANG_KAPITALISASI_BAWAAN, AMBANG_PENGADAAN_BAWAAN, SETTING_AMBANG_KAPITALISASI, SETTING_AMBANG_PENGADAAN, rupiah } from '@/lib/aset/konstanta';
import { getUnitAktif, whereUnitAktif } from '@/lib/unit-scope';
import { Tabel } from '@/components';
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
                    <Kembali ke={K} /><input type="hidden" name="itemId" value={p.id} />
                    <select name="direction" style={gaya}><option>Masuk</option><option>Keluar</option></select>
                    <input name="quantity" type="number" min={1} required placeholder="Jml" style={{ ...gaya, width: 70 }} />
                    <input name="purpose" placeholder="Keperluan" style={{ ...gaya, width: 130 }} />
                    <button type="submit" className="btn-sekunder" style={{ fontSize: 12 }}>Catat</button>
                  </form>
                </td>
              </tr>
            ))}
          </Tabel>
          <form action={tambahPersediaan} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <Kembali ke={K} />
            <input name="name" required placeholder="Nama barang" style={gaya} />
            <input name="unitOfMeasure" required placeholder="Satuan" style={{ ...gaya, width: 90 }} />
            <input name="stock" type="number" min={0} placeholder="Stok awal" style={{ ...gaya, width: 100 }} />
            <input name="minStock" type="number" min={0} placeholder="Stok min" style={{ ...gaya, width: 100 }} />
            <select name="unitId" style={gaya}>{units.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}</select>
            <input name="storage" placeholder="Gudang" style={gaya} />
            <button type="submit" className="btn-sekunder">Tambah barang</button>
          </form>
        </div>
      )}

      {izin.master_manage && (
        <>
          <div className="card">
            <h3 className="card-judul">Ambang persetujuan</h3>
            <form action={simpanAmbang} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
              <Kembali ke={K} />
              <div className="field" style={{ marginBottom: 0 }}><label>Pengadaan butuh ketua yayasan bila &gt; (Rp)</label><input name="ambangPengadaan" type="number" min={0} defaultValue={ambangPengadaan} /></div>
              <div className="field" style={{ marginBottom: 0 }}><label>Ambang kapitalisasi per unit (Rp)</label><input name="ambangKapitalisasi" type="number" min={0} defaultValue={ambangKapitalisasi} /></div>
              <button type="submit" className="btn">Simpan ambang</button>
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
              <input name="code" required placeholder="Kode (B.02.04)" style={{ ...gaya, width: 130 }} />
              <input name="name" required placeholder="Nama kategori" style={gaya} />
              <select name="kibGroup" style={gaya}>{['A', 'B', 'C', 'D', 'E', 'F'].map((g) => <option key={g}>{g}</option>)}</select>
              <input name="usefulLifeYears" type="number" min={0} placeholder="Umur (thn)" style={{ ...gaya, width: 100 }} />
              <label style={{ fontSize: 12.5 }}><input type="checkbox" name="needsMaintenance" /> perlu servis</label>
              <label style={{ fontSize: 12.5 }}><input type="checkbox" name="isConsumable" /> habis pakai</label>
              <button type="submit" className="btn-sekunder">Simpan kategori</button>
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
                <input name="code" required placeholder="KODE" style={{ ...gaya, width: 120 }} />
                <input name="name" required placeholder="Nama" style={gaya} />
                <label style={{ fontSize: 12.5 }}><input type="checkbox" name="restrictedDisposal" /> penghapusan jalur khusus</label>
                <button type="submit" className="btn-sekunder">Simpan</button>
              </form>
            </div>
            <div className="card">
              <h3 className="card-judul">Vendor</h3>
              <Tabel kolom={['Nama', 'Telepon', 'Alamat']}>
                {vendor.map((v) => <tr key={v.id}><td>{v.name}</td><td>{v.phone ?? '-'}</td><td>{v.address ?? '-'}</td></tr>)}
              </Tabel>
              <form action={simpanVendor} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <Kembali ke={K} />
                <input name="name" required placeholder="Nama vendor" style={gaya} />
                <input name="phone" placeholder="Telepon" style={{ ...gaya, width: 130 }} />
                <input name="address" placeholder="Alamat" style={gaya} />
                <button type="submit" className="btn-sekunder">Tambah vendor</button>
              </form>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
