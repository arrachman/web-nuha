import type { Asset, AssetCategory, AssetLocation, FundingSource, Unit, Vendor } from '@prisma/client';
import { CARA_PEROLEHAN, LABEL_KONDISI, LABEL_STATUS_ASET } from '@/lib/aset/konstanta';

type Pilihan = {
  units: Unit[]; kategori: AssetCategory[]; lokasi: AssetLocation[]; dana: FundingSource[]; vendor: Vendor[];
  staf: Array<{ id: bigint; person: { fullName: string } }>;
};

const tgl = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : '');

/** Form registrasi/ubah aset. Unit, lokasi, pemegang hanya diisi saat registrasi — sesudahnya lewat mutasi. */
export function FormAset({ pilihan, aset }: { pilihan: Pilihan; aset?: Asset }) {
  const attr = (aset?.attributes ?? {}) as Record<string, string>;
  const baru = !aset;
  return (
    <>
      <div className="grid g2">
        <div className="field" style={{ gridColumn: 'span 2' }}><label>Nama aset *</label><input name="name" required defaultValue={aset?.name} placeholder="mis. Proyektor Epson EB-X500" /></div>
        <div className="field"><label>Kategori *</label>
          <select name="categoryId" required defaultValue={aset?.categoryId}>
            <option value="">— pilih —</option>
            {pilihan.kategori.filter((k) => !k.isConsumable).map((k) => <option key={k.id} value={k.id}>{k.code} · {k.name} (KIB {k.kibGroup})</option>)}
          </select>
        </div>
        {baru && (
          <div className="field"><label>Unit pemilik *</label>
            <select name="ownerUnitId" required>{pilihan.units.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}</select>
          </div>
        )}
        {baru && (
          <div className="field"><label>Lokasi *</label>
            <select name="locationId" required>
              <option value="">— pilih —</option>
              {pilihan.lokasi.map((l) => <option key={l.id} value={l.id}>{l.code} · {l.name}</option>)}
            </select>
          </div>
        )}
        {baru && (
          <div className="field"><label>Pemegang (opsional)</label>
            <select name="holderStaffId"><option value="">— tidak ada —</option>{pilihan.staf.map((s) => <option key={String(s.id)} value={String(s.id)}>{s.person.fullName}</option>)}</select>
          </div>
        )}
        <div className="field"><label>Merk</label><input name="brand" defaultValue={aset?.brand ?? ''} /></div>
        <div className="field"><label>Model / tipe</label><input name="model" defaultValue={aset?.model ?? ''} /></div>
        <div className="field"><label>Nomor seri</label><input name="serialNumber" defaultValue={aset?.serialNumber ?? ''} /></div>
        <div className="field"><label>Jumlah (kolektif &gt; 1)</label><input name="quantity" type="number" min={1} defaultValue={aset?.quantity ?? 1} /></div>
        <div className="field"><label>Satuan</label><input name="unitOfMeasure" defaultValue={aset?.unitOfMeasure ?? 'unit'} /></div>
        <div className="field"><label>Tanggal perolehan *</label><input name="acquisitionDate" type="date" required defaultValue={tgl(aset?.acquisitionDate)} /></div>
        <div className="field"><label>Cara perolehan *</label>
          <select name="acquisitionMethod" defaultValue={aset?.acquisitionMethod ?? 'Pembelian'}>{CARA_PEROLEHAN.map((c) => <option key={c}>{c}</option>)}</select>
        </div>
        <div className="field"><label>Harga perolehan (Rp) *</label><input name="acquisitionCost" type="number" min={0} step="1" required defaultValue={aset ? Number(aset.acquisitionCost) : undefined} /></div>
        <div className="field"><label>Sumber dana *</label>
          <select name="fundingSourceId" required defaultValue={aset?.fundingSourceId}>{pilihan.dana.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        </div>
        <div className="field"><label>Pemberi (wakaf/hibah/donasi)</label><input name="donorName" defaultValue={aset?.donorName ?? ''} /></div>
        <div className="field"><label>Vendor</label>
          <select name="vendorId" defaultValue={aset?.vendorId ?? ''}><option value="">— tidak ada —</option>{pilihan.vendor.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
        </div>
        <div className="field"><label>Umur ekonomis (tahun)</label><input name="usefulLifeYears" type="number" min={0} defaultValue={aset?.usefulLifeYears ?? ''} placeholder="bawaan kategori" /></div>
        <div className="field"><label>Nilai residu (Rp)</label><input name="residualValue" type="number" min={0} defaultValue={aset?.residualValue ? Number(aset.residualValue) : ''} /></div>
        <div className="field"><label>Garansi sampai</label><input name="warrantyUntil" type="date" defaultValue={tgl(aset?.warrantyUntil)} /></div>
        <div className="field"><label>Kondisi</label>
          <select name="condition" defaultValue={aset?.condition ?? 'Baik'}>{Object.entries(LABEL_KONDISI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </div>
        {!baru && (
          <div className="field"><label>Status</label>
            <select name="status" defaultValue={aset?.status}>{Object.entries(LABEL_STATUS_ASET).filter(([k]) => k !== 'Dihapus' && k !== 'MenungguPenghapusan').map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </div>
        )}
        <div className="field" style={{ display: 'flex', gap: 18, alignItems: 'center', gridColumn: 'span 2' }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', margin: 0 }}><input type="checkbox" name="isBorrowable" defaultChecked={aset?.isBorrowable} style={{ width: 'auto', height: 'auto' }} /> Bisa dipinjam</label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', margin: 0 }}><input type="checkbox" name="isEstimatedValue" defaultChecked={aset?.isEstimatedValue} style={{ width: 'auto', height: 'auto' }} /> Nilai taksiran</label>
        </div>
        <div className="field" style={{ gridColumn: 'span 2' }}><label>Spesifikasi</label><textarea name="specification" rows={2} defaultValue={aset?.specification ?? ''} /></div>
      </div>
      <details style={{ margin: '4px 0 14px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Atribut khusus (kendaraan / tanah / gedung)</summary>
        <div className="grid g3" style={{ marginTop: 10 }}>
          {[['nopol', 'Nomor polisi'], ['noRangka', 'No. rangka'], ['noMesin', 'No. mesin'], ['tglPajak', 'Tgl pajak (YYYY-MM-DD)'], ['luasM2', 'Luas (m²)'], ['noSertifikat', 'No. sertifikat'], ['noAIW', 'No. Akta Ikrar Wakaf'], ['atasNama', 'Atas nama'], ['nazhir', 'Nazhir'], ['jumlahLantai', 'Jumlah lantai'], ['tahunBangun', 'Tahun bangun'], ['imbPbg', 'IMB/PBG']].map(([k, l]) => (
            <div className="field" key={k}><label>{l}</label><input name={`attr_${k}`} defaultValue={attr[k] ?? ''} /></div>
          ))}
        </div>
      </details>
      <div className="field"><label>Catatan</label><textarea name="note" rows={2} defaultValue={aset?.note ?? ''} /></div>
    </>
  );
}
