import type { Asset, AssetCategory, AssetLocation, FundingSource, Unit, Vendor } from '@prisma/client';
import { FormField, Input, Select, Textarea } from '@/components';
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
        <div className="field" style={{ gridColumn: 'span 2' }}><label>Nama aset *</label><Input name="name" required defaultValue={aset?.name} placeholder="mis. Proyektor Epson EB-X500" /></div>
        <FormField label="Kategori *" htmlFor="categoryId">
          <Select id="categoryId" name="categoryId" required defaultValue={aset?.categoryId}>
            <option value="">— pilih —</option>
            {pilihan.kategori.filter((k) => !k.isConsumable).map((k) => <option key={k.id} value={k.id}>{k.code} · {k.name} (KIB {k.kibGroup})</option>)}
          </Select>
        </FormField>
        {baru && (
          <FormField label="Unit pemilik *" htmlFor="ownerUnitId">
            <Select id="ownerUnitId" name="ownerUnitId" required>{pilihan.units.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}</Select>
          </FormField>
        )}
        {baru && (
          <FormField label="Lokasi *" htmlFor="locationId">
            <Select id="locationId" name="locationId" required>
              <option value="">— pilih —</option>
              {pilihan.lokasi.map((l) => <option key={l.id} value={l.id}>{l.code} · {l.name}</option>)}
            </Select>
          </FormField>
        )}
        {baru && (
          <FormField label="Pemegang (opsional)" htmlFor="holderStaffId">
            <Select id="holderStaffId" name="holderStaffId"><option value="">— tidak ada —</option>{pilihan.staf.map((s) => <option key={String(s.id)} value={String(s.id)}>{s.person.fullName}</option>)}</Select>
          </FormField>
        )}
        <FormField label="Merk" htmlFor="brand"><Input id="brand" name="brand" defaultValue={aset?.brand ?? ''} /></FormField>
        <FormField label="Model / tipe" htmlFor="model"><Input id="model" name="model" defaultValue={aset?.model ?? ''} /></FormField>
        <FormField label="Nomor seri" htmlFor="serialNumber"><Input id="serialNumber" name="serialNumber" defaultValue={aset?.serialNumber ?? ''} /></FormField>
        <FormField label="Jumlah (kolektif > 1)" htmlFor="quantity"><Input id="quantity" name="quantity" type="number" min={1} defaultValue={aset?.quantity ?? 1} /></FormField>
        <FormField label="Satuan" htmlFor="unitOfMeasure"><Input id="unitOfMeasure" name="unitOfMeasure" defaultValue={aset?.unitOfMeasure ?? 'unit'} /></FormField>
        <FormField label="Tanggal perolehan *" htmlFor="acquisitionDate"><Input id="acquisitionDate" name="acquisitionDate" type="date" required defaultValue={tgl(aset?.acquisitionDate)} /></FormField>
        <FormField label="Cara perolehan *" htmlFor="acquisitionMethod">
          <Select id="acquisitionMethod" name="acquisitionMethod" defaultValue={aset?.acquisitionMethod ?? 'Pembelian'}>{CARA_PEROLEHAN.map((c) => <option key={c}>{c}</option>)}</Select>
        </FormField>
        <FormField label="Harga perolehan (Rp) *" htmlFor="acquisitionCost"><Input id="acquisitionCost" name="acquisitionCost" type="number" min={0} step="1" required defaultValue={aset ? Number(aset.acquisitionCost) : undefined} /></FormField>
        <FormField label="Sumber dana *" htmlFor="fundingSourceId">
          <Select id="fundingSourceId" name="fundingSourceId" required defaultValue={aset?.fundingSourceId}>{pilihan.dana.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
        </FormField>
        <FormField label="Pemberi (wakaf/hibah/donasi)" htmlFor="donorName"><Input id="donorName" name="donorName" defaultValue={aset?.donorName ?? ''} /></FormField>
        <FormField label="Vendor" htmlFor="vendorId">
          <Select id="vendorId" name="vendorId" defaultValue={aset?.vendorId ?? ''}><option value="">— tidak ada —</option>{pilihan.vendor.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</Select>
        </FormField>
        <FormField label="Umur ekonomis (tahun)" htmlFor="usefulLifeYears"><Input id="usefulLifeYears" name="usefulLifeYears" type="number" min={0} defaultValue={aset?.usefulLifeYears ?? ''} placeholder="bawaan kategori" /></FormField>
        <FormField label="Nilai residu (Rp)" htmlFor="residualValue"><Input id="residualValue" name="residualValue" type="number" min={0} defaultValue={aset?.residualValue ? Number(aset.residualValue) : ''} /></FormField>
        <FormField label="Garansi sampai" htmlFor="warrantyUntil"><Input id="warrantyUntil" name="warrantyUntil" type="date" defaultValue={tgl(aset?.warrantyUntil)} /></FormField>
        <FormField label="Kondisi" htmlFor="condition">
          <Select id="condition" name="condition" defaultValue={aset?.condition ?? 'Baik'}>{Object.entries(LABEL_KONDISI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        </FormField>
        {!baru && (
          <FormField label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue={aset?.status}>{Object.entries(LABEL_STATUS_ASET).filter(([k]) => k !== 'Dihapus' && k !== 'MenungguPenghapusan').map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
          </FormField>
        )}
        <div className="field" style={{ display: 'flex', gap: 18, alignItems: 'center', gridColumn: 'span 2' }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', margin: 0 }}><Input type="checkbox" name="isBorrowable" defaultChecked={aset?.isBorrowable} style={{ width: 'auto', height: 'auto' }} /> Bisa dipinjam</label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', margin: 0 }}><Input type="checkbox" name="isEstimatedValue" defaultChecked={aset?.isEstimatedValue} style={{ width: 'auto', height: 'auto' }} /> Nilai taksiran</label>
        </div>
        <div className="field" style={{ gridColumn: 'span 2' }}><label>Spesifikasi</label><Textarea name="specification" rows={2} defaultValue={aset?.specification ?? ''} /></div>
      </div>
      <details style={{ margin: '4px 0 14px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Atribut khusus (kendaraan / tanah / gedung)</summary>
        <div className="grid g3" style={{ marginTop: 10 }}>
          {[['nopol', 'Nomor polisi'], ['noRangka', 'No. rangka'], ['noMesin', 'No. mesin'], ['tglPajak', 'Tgl pajak (YYYY-MM-DD)'], ['luasM2', 'Luas (m²)'], ['noSertifikat', 'No. sertifikat'], ['noAIW', 'No. Akta Ikrar Wakaf'], ['atasNama', 'Atas nama'], ['nazhir', 'Nazhir'], ['jumlahLantai', 'Jumlah lantai'], ['tahunBangun', 'Tahun bangun'], ['imbPbg', 'IMB/PBG']].map(([k, l]) => (
            <div className="field" key={k}><label>{l}</label><Input name={`attr_${k}`} defaultValue={attr[k] ?? ''} /></div>
          ))}
        </div>
      </details>
      <FormField label="Catatan" htmlFor="note"><Textarea id="note" name="note" rows={2} defaultValue={aset?.note ?? ''} /></FormField>
    </>
  );
}
