import { Fragment } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePage } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { izinSarpras, whereAsetTerlihat } from '@/lib/aset/akses';
import { hitungSusut } from '@/lib/aset/susut';
import { qrSvg } from '@/lib/aset/qr';
import { GOLONGAN_KIB, JENIS_BERKAS_ASET, LABEL_STATUS_KERUSAKAN, rupiah } from '@/lib/aset/konstanta';
import { Button, FormField, Input, JudulHalaman, Kosong, PesanAksi, Select, Tabel, satu, type SearchParams } from '@/components';
import { mutasiAset, ubahAset, unggahBerkasAset } from '../../actions';
import { BadgeKondisi, BadgeStatus, Kembali } from '../../Kembali';
import { lokasiPilihan, stafPilihan, unitDalamCakupan } from '../../data';
import { FormAset } from '../FormAset';

export default async function DetailAsetPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  const session = await requirePage('sarpras');
  const izin = await izinSarpras(session);
  const { id: idRaw } = await params;
  const sp = await searchParams;
  if (!/^\d+$/.test(idRaw)) notFound();
  const id = BigInt(idRaw);

  const aset = await prisma.asset.findFirst({
    where: { id, ...(await whereAsetTerlihat(session, izin)) },
    include: {
      category: true, ownerUnit: true, location: true, fundingSource: true, vendor: true, holder: { include: { person: true } },
      files: { include: { file: true }, orderBy: { createdAt: 'desc' } },
      movements: { orderBy: { date: 'desc' } },
      loanItems: { include: { loan: { include: { borrower: { include: { person: true } } } } }, orderBy: { id: 'desc' }, take: 10 },
      damages: { orderBy: { createdAt: 'desc' }, take: 10 },
      maintenance: { orderBy: { dueDate: 'asc' } },
    },
  });
  if (!aset) notFound();

  const kembali = `/sarpras/aset/${aset.id}`;
  const susut = hitungSusut({ harga: Number(aset.acquisitionCost), residu: aset.residualValue ? Number(aset.residualValue) : null, umurTahun: aset.usefulLifeYears, tanggalPerolehan: aset.acquisitionDate, kibGroup: aset.category.kibGroup });
  const enamBulanLalu = new Date(Date.now() - 183 * 86_400_000);
  const rusakBerulang = aset.damages.filter((d) => d.createdAt >= enamBulanLalu).length >= 3;
  const attr = (aset.attributes ?? {}) as Record<string, string>;
  const [svg, lokasi, units, staf, kategori, dana, vendor] = await Promise.all([
    qrSvg(`/a/${aset.qrToken}`, 132),
    izin.asset_manage ? lokasiPilihan(session) : Promise.resolve([]),
    izin.asset_manage ? unitDalamCakupan(session) : Promise.resolve([]),
    izin.asset_manage ? stafPilihan() : Promise.resolve([]),
    izin.asset_manage ? prisma.assetCategory.findMany({ orderBy: { code: 'asc' } }) : Promise.resolve([]),
    izin.asset_manage ? prisma.fundingSource.findMany() : Promise.resolve([]),
    izin.asset_manage ? prisma.vendor.findMany() : Promise.resolve([]),
  ]);
  const namaLokasi = new Map((await prisma.assetLocation.findMany({ select: { id: true, name: true } })).map((l) => [l.id, l.name]));

  return (
    <>
      <JudulHalaman judul={aset.name} sub={`${aset.inventoryCode} · ${aset.category.name} · ${aset.ownerUnit.nama}`} />
      <div style={{ marginBottom: 14, display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 13 }}>
        <Link href="/sarpras?tab=aset">&larr; Daftar aset</Link>
        <Link href={`/lapor-kerusakan?aset=${aset.qrToken}`}>Laporkan kerusakan</Link>
        <Link href={`/cetak/label-aset?id=${aset.id}`} target="_blank">Cetak label QR</Link>
      </div>
      <PesanAksi pesan={satu(sp.pesan) || undefined} galat={satu(sp.galat) || undefined} />
      {rusakBerulang && <div className="alert alert-peringatan" style={{ marginBottom: 14 }}><span><b>Kandidat penggantian</b>Aset ini dilaporkan rusak ≥ 3 kali dalam 6 bulan terakhir.</span></div>}

      <div className="grid g2" style={{ gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div dangerouslySetInnerHTML={{ __html: svg }} aria-label="QR aset" data-testid="qr-aset" />
            <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '130px 1fr', rowGap: 6, fontSize: 13, flex: 1, minWidth: 240 }}>
              <dt className="muted">Kondisi</dt><dd><BadgeKondisi kondisi={aset.condition} /></dd>
              <dt className="muted">Status</dt><dd><BadgeStatus status={aset.status} /></dd>
              <dt className="muted">Lokasi</dt><dd>{aset.location?.name ?? '-'}</dd>
              <dt className="muted">Pemegang</dt><dd>{aset.holder?.person.fullName ?? '-'}</dd>
              <dt className="muted">Jumlah</dt><dd>{aset.quantity} {aset.unitOfMeasure}</dd>
              <dt className="muted">Merk / model</dt><dd>{[aset.brand, aset.model].filter(Boolean).join(' ') || '-'}</dd>
              <dt className="muted">No. seri</dt><dd>{aset.serialNumber ?? '-'}</dd>
              <dt className="muted">Perolehan</dt><dd>{aset.acquisitionMethod}, {aset.acquisitionDate.toLocaleDateString('id-ID')}</dd>
              <dt className="muted">Sumber dana</dt><dd>{aset.fundingSource.name}{aset.donorName ? ` · ${aset.donorName}` : ''}</dd>
              <dt className="muted">Golongan</dt><dd>KIB {aset.category.kibGroup} — {GOLONGAN_KIB[aset.category.kibGroup]}</dd>
              {Object.entries(attr).map(([k, v]) => <Fragment key={k}><dt className="muted">{k}</dt><dd>{v}</dd></Fragment>)}
            </dl>
          </div>

          {izin.view_value && (
            <div className="card">
              <h3 className="card-judul">Nilai & penyusutan (garis lurus)</h3>
              <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '180px 1fr', rowGap: 6, fontSize: 13 }}>
                <dt className="muted">Harga perolehan</dt><dd>{rupiah(aset.acquisitionCost)}{aset.isEstimatedValue ? ' (taksiran)' : ''}</dd>
                <dt className="muted">Umur ekonomis</dt><dd>{aset.usefulLifeYears ? `${aset.usefulLifeYears} tahun` : '-'}</dd>
                <dt className="muted">Penyusutan / bulan</dt><dd>{susut.disusutkan ? rupiah(susut.susutPerBulan) : 'Tidak disusutkan'}</dd>
                <dt className="muted">Akumulasi ({susut.bulanBerjalan} bln)</dt><dd>{rupiah(susut.akumulasi)}</dd>
                <dt className="muted">Nilai buku hari ini</dt><dd style={{ fontWeight: 700 }} data-testid="nilai-buku">{rupiah(susut.nilaiBuku)}</dd>
              </dl>
            </div>
          )}

          <div className="card">
            <h3 className="card-judul">Foto & dokumen</h3>
            {aset.files.length === 0 ? <Kosong pesan="Belum ada berkas." /> : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {aset.files.map((f) => <li key={String(f.id)}><b>{f.kind}</b> · <a href={`/berkas/${f.fileId}`} target="_blank" rel="noreferrer">{f.file.originalName}</a></li>)}
              </ul>
            )}
            {izin.asset_manage && (
              <form action={unggahBerkasAset} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <Kembali ke={kembali} /><Input type="hidden" name="id" value={String(aset.id)} />
                <div className="field" style={{ marginBottom: 0 }}>
                  <Select name="kind">{JENIS_BERKAS_ASET.map((k) => <option key={k}>{k}</option>)}</Select>
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <Input type="file" name="berkas" required accept="image/*,application/pdf" />
                </div>
                <Button type="submit" varian="sekunder">Unggah</Button>
              </form>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {izin.asset_manage && aset.status !== 'Dihapus' && (
            <div className="card">
              <h3 className="card-judul">Mutasi aset</h3>
              <form action={mutasiAset} className="grid g2">
                <Kembali ke={kembali} /><Input type="hidden" name="id" value={String(aset.id)} />
                <FormField label="Pindah ke lokasi" htmlFor="toLocationId">
                  <Select id="toLocationId" name="toLocationId" defaultValue={aset.locationId ?? ''}><option value="">— tetap —</option>{lokasi.map((l) => <option key={l.id} value={l.id}>{l.code} · {l.name}</option>)}</Select>
                </FormField>
                <FormField label="Pindah ke unit" htmlFor="toUnitId">
                  <Select id="toUnitId" name="toUnitId" defaultValue={aset.ownerUnitId}>{units.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}</Select>
                </FormField>
                <FormField label="Serah terima ke pemegang" htmlFor="toHolderId">
                  <Select id="toHolderId" name="toHolderId" defaultValue={aset.holderStaffId ? String(aset.holderStaffId) : ''}>
                    <option value="">— tetap —</option><option value="kosong">(kosongkan pemegang)</option>
                    {staf.map((s) => <option key={String(s.id)} value={String(s.id)}>{s.person.fullName}</option>)}
                  </Select>
                </FormField>
                <FormField label="BAST (opsional)" htmlFor="bast"><Input id="bast" type="file" name="bast" accept="image/*,application/pdf" /></FormField>
                <div className="field" style={{ gridColumn: 'span 2' }}><label>Alasan</label><Input name="reason" /></div>
                <div style={{ gridColumn: 'span 2' }}><Button type="submit">Catat mutasi</Button></div>
              </form>
            </div>
          )}

          <div className="card">
            <h3 className="card-judul">Riwayat aset</h3>
            <Tabel kolom={['Tanggal', 'Peristiwa', 'Keterangan']}>
              {[
                ...aset.movements.map((m) => ({ t: m.date, p: m.type.replace(/([a-z])([A-Z])/g, '$1 $2'), k: `${m.fromLocationId ? namaLokasi.get(m.fromLocationId) ?? '' : ''}${m.toLocationId && m.toLocationId !== m.fromLocationId ? ` → ${namaLokasi.get(m.toLocationId) ?? ''}` : ''} ${m.reason ?? ''}`.trim(), id: `m${m.id}` })),
                ...aset.loanItems.map((li) => ({ t: li.loan.startAt, p: `Pinjam (${li.loan.status})`, k: `${li.loan.code} · ${li.loan.borrower.person.fullName} · ${li.loan.purpose}`, id: `l${li.id}` })),
                ...aset.damages.map((d) => ({ t: d.createdAt, p: `Kerusakan ${d.severity}`, k: `${d.code} · ${LABEL_STATUS_KERUSAKAN[d.status] ?? d.status} · ${d.description}`, id: `d${d.id}` })),
                ...aset.maintenance.filter((m) => m.lastDoneAt).map((m) => ({ t: m.lastDoneAt!, p: 'Pemeliharaan', k: m.title, id: `p${m.id}` })),
              ].sort((a, b) => b.t.getTime() - a.t.getTime()).map((r) => (
                <tr key={r.id}><td>{r.t.toLocaleDateString('id-ID')}</td><td>{r.p}</td><td>{r.k || '-'}</td></tr>
              ))}
            </Tabel>
          </div>

          {izin.asset_manage && aset.status !== 'Dihapus' && (
            <details className="card">
              <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Ubah data aset</summary>
              <form action={ubahAset} style={{ marginTop: 12 }}>
                <Kembali ke={kembali} /><Input type="hidden" name="id" value={String(aset.id)} />
                <Input type="hidden" name="ownerUnitId" value={aset.ownerUnitId} />
                <Input type="hidden" name="locationId" value={aset.locationId ?? ''} />
                <FormAset pilihan={{ units, kategori, lokasi, dana, vendor, staf }} aset={aset} />
                <Button type="submit">Simpan perubahan</Button>
              </form>
            </details>
          )}
        </div>
      </div>
    </>
  );
}
