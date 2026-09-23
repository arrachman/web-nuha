import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import type { SessionPayload } from '@/lib/auth';
import { whereAsetTerlihat, type IzinSarpras } from '@/lib/aset/akses';
import { LABEL_KONDISI, LABEL_STATUS_ASET, rupiah } from '@/lib/aset/konstanta';
import { Kosong, Pagination, Tabel, UKURAN_HALAMAN, bacaHalaman, satu, type SearchParams } from '@/components';
import { imporAsetCsv } from './actions';
import { BadgeKondisi, BadgeStatus, Kembali } from './Kembali';
import { lokasiPilihan, unitDalamCakupan } from './data';

const gayaInput = { padding: '9px 11px', borderRadius: 10, border: '1px solid var(--garis)' } as const;

export async function TabAset({ session, izin, sp }: { session: SessionPayload; izin: IzinSarpras; sp: SearchParams }) {
  const q = satu(sp.q);
  const unitId = satu(sp.unit);
  const kategoriId = satu(sp.kategori);
  const lokasiId = satu(sp.lokasi);
  const kondisi = satu(sp.kondisi);
  const status = satu(sp.status);
  const halaman = bacaHalaman(sp);

  const where = {
    ...(await whereAsetTerlihat(session, izin)),
    deletedAt: null,
    ...(status ? { status: status as never } : { status: { not: 'Dihapus' as const } }),
    ...(q ? { AND: [{ OR: [{ name: { contains: q } }, { inventoryCode: { contains: q } }, { serialNumber: { contains: q } }] }] } : {}),
    ...(unitId ? { ownerUnitId: Number(unitId) } : {}),
    ...(kategoriId ? { categoryId: Number(kategoriId) } : {}),
    ...(lokasiId ? { locationId: Number(lokasiId) } : {}),
    ...(kondisi ? { condition: kondisi as never } : {}),
  };
  const [total, aset, units, kategori, lokasi] = await Promise.all([
    prisma.asset.count({ where }),
    prisma.asset.findMany({
      where, include: { category: true, location: true, ownerUnit: true, holder: { include: { person: true } } },
      orderBy: { inventoryCode: 'asc' }, skip: (halaman - 1) * UKURAN_HALAMAN, take: UKURAN_HALAMAN,
    }),
    unitDalamCakupan(session),
    prisma.assetCategory.findMany({ orderBy: { code: 'asc' } }),
    lokasiPilihan(session, true),
  ]);
  const totalHalaman = Math.max(1, Math.ceil(total / UKURAN_HALAMAN));
  const qs = new URLSearchParams(Object.entries({ tab: 'aset', q, unit: unitId, kategori: kategoriId, lokasi: lokasiId, kondisi, status }).filter(([, v]) => v) as [string, string][]);

  const kolom: Array<string | { label: string; num?: boolean }> = ['Pilih', 'Kode / nama', 'Kategori', 'Lokasi / pemegang', 'Unit', { label: 'Jml', num: true }, 'Kondisi', 'Status'];
  if (izin.view_value) kolom.push({ label: 'Harga perolehan', num: true });
  kolom.push('Aksi');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {izin.asset_manage && (
        <div className="card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/sarpras/aset/baru" className="btn">+ Registrasi aset</Link>
          <form action={imporAsetCsv} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Kembali ke="/sarpras?tab=aset" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Impor buku inventaris lama (CSV):</span>
            <input type="file" name="berkas" accept=".csv,text/csv" required />
            <button type="submit" className="btn-sekunder">Impor</button>
            <a href="/sarpras/laporan/templat-impor" style={{ fontSize: 12 }}>Unduh templat</a>
          </form>
        </div>
      )}

      <div className="card">
        <form method="get" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <input type="hidden" name="tab" value="aset" />
          <input name="q" defaultValue={q} placeholder="Cari nama / kode / nomor seri" style={{ ...gayaInput, minWidth: 220 }} />
          <select name="unit" defaultValue={unitId} style={gayaInput}><option value="">Semua unit</option>{units.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}</select>
          <select name="kategori" defaultValue={kategoriId} style={gayaInput}><option value="">Semua kategori</option>{kategori.map((k) => <option key={k.id} value={k.id}>{k.code} {k.name}</option>)}</select>
          <select name="lokasi" defaultValue={lokasiId} style={gayaInput}><option value="">Semua lokasi</option>{lokasi.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
          <select name="kondisi" defaultValue={kondisi} style={gayaInput}><option value="">Semua kondisi</option>{Object.entries(LABEL_KONDISI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select name="status" defaultValue={status} style={gayaInput}><option value="">Status (selain Dihapus)</option>{Object.entries(LABEL_STATUS_ASET).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <button type="submit" className="btn-sekunder">Saring</button>
        </form>

        {aset.length === 0 ? <Kosong pesan={izin.pengelola ? 'Belum ada aset yang cocok.' : 'Belum ada aset di ruang yang Anda tanggung jawabi atau yang Anda pegang.'} /> : (
          <form method="get" action="/cetak/label-aset" target="_blank">
            <Tabel kolom={kolom}>
              {aset.map((a) => (
                <tr key={String(a.id)} data-testid={`aset-${a.inventoryCode}`}>
                  <td><input type="checkbox" name="id" value={String(a.id)} aria-label={`Pilih ${a.name}`} /></td>
                  <td><div style={{ fontWeight: 600 }}>{a.name}</div><div className="muted" style={{ fontSize: 11.5 }}>{a.inventoryCode}</div></td>
                  <td>{a.category.name}</td>
                  <td>{a.location?.name ?? '-'}{a.holder ? <div className="muted" style={{ fontSize: 11.5 }}>dipegang {a.holder.person.fullName}</div> : null}</td>
                  <td>{a.ownerUnit.nama}</td>
                  <td className="num">{a.quantity} {a.unitOfMeasure}</td>
                  <td><BadgeKondisi kondisi={a.condition} /></td>
                  <td><BadgeStatus status={a.status} /></td>
                  {izin.view_value && <td className="num" data-testid="kolom-harga">{rupiah(a.acquisitionCost)}{a.isEstimatedValue ? '*' : ''}</td>}
                  <td><Link href={`/sarpras/aset/${a.id}`} className="btn-sekunder" style={{ fontSize: 12.5 }}>Detail</Link></td>
                </tr>
              ))}
            </Tabel>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 10, flexWrap: 'wrap' }}>
              <button type="submit" className="btn-sekunder">Cetak label QR terpilih</button>
              <span className="muted" style={{ fontSize: 12 }}>{total} aset{izin.view_value ? ' · * nilai taksiran' : ''}</span>
            </div>
          </form>
        )}
        <Pagination halaman={halaman} totalHalaman={totalHalaman} total={total} jumlahBaris={aset.length} ukuranHalaman={UKURAN_HALAMAN} buatHref={(h) => `/sarpras?${qs.toString()}&halaman=${h}`} />
      </div>
    </div>
  );
}
