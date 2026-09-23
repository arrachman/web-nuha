import { readSession, isSuperAdmin } from '@/lib/auth';
import { can } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { csvResponse } from '@/lib/csv';
import { hitungSusut } from '@/lib/aset/susut';
import { LABEL_KONDISI } from '@/lib/aset/konstanta';
import { recordAudit } from '@/lib/audit';

const tgl = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : '');

/** Ekspor laporan sarpras (04 §7) — butuh sarpras.export, dibatasi cakupan unit. */
export async function GET(_req: Request, { params }: { params: Promise<{ jenis: string }> }) {
  const session = await readSession();
  if (!session) return new Response('Perlu masuk.', { status: 401 });
  const { jenis } = await params;

  if (jenis === 'templat-impor') {
    if (!(await can(session, 'sarpras.asset_manage'))) return new Response('Tidak berwenang.', { status: 403 });
    return csvResponse('templat-impor-aset.csv',
      ['nama', 'kode_kategori', 'unit', 'kode_lokasi', 'tanggal_perolehan', 'cara_perolehan', 'harga', 'kode_sumber_dana', 'jumlah', 'satuan', 'merk', 'kondisi', 'pemberi'],
      [['Kursi guru', 'B.01.01', 'SMP', 'G-A.1.02', '2024-07-01', 'Pembelian', '450000', 'BOS', '4', 'unit', 'Chitose', 'Baik', '']]);
  }
  if (!(await can(session, 'sarpras.export'))) return new Response('Tidak berwenang.', { status: 403 });

  const unitIds = !isSuperAdmin(session) && session.unitIds ? session.unitIds : null;
  const whereAset = { deletedAt: null, ...(unitIds ? { ownerUnitId: { in: unitIds } } : {}) };
  const hariIni = new Date();
  await recordAudit({ aksi: 'SARPRAS_EKSPOR', entitas: 'assets', entitasId: jenis, ringkasan: `Ekspor laporan sarpras ${jenis}.`, aktor: { id: session.userId, nama: session.nama } });

  const aset = () => prisma.asset.findMany({ where: { ...whereAset, status: { not: 'Dihapus' } }, include: { category: true, ownerUnit: true, location: true, fundingSource: true }, orderBy: [{ ownerUnitId: 'asc' }, { inventoryCode: 'asc' }] });
  const nb = (a: Awaited<ReturnType<typeof aset>>[number]) => hitungSusut({ harga: Number(a.acquisitionCost), residu: a.residualValue ? Number(a.residualValue) : null, umurTahun: a.usefulLifeYears, tanggalPerolehan: a.acquisitionDate, kibGroup: a.category.kibGroup }, hariIni);

  if (jenis === 'buku-inventaris' || jenis.startsWith('kib-')) {
    const golongan = jenis.startsWith('kib-') ? jenis.slice(4).toUpperCase() : null;
    const rows = (await aset()).filter((a) => !golongan || a.category.kibGroup === golongan);
    return csvResponse(`${jenis}.csv`,
      ['Kode inventaris', 'Nama', 'Kategori', 'Golongan KIB', 'Unit', 'Lokasi', 'Merk', 'No. seri', 'Jumlah', 'Satuan', 'Tgl perolehan', 'Cara perolehan', 'Sumber dana', 'Pemberi', 'Harga perolehan', 'Nilai buku', 'Kondisi', 'Status', 'Atribut'],
      rows.map((a) => [a.inventoryCode, a.name, a.category.name, a.category.kibGroup, a.ownerUnit.nama, a.location?.name ?? '', a.brand ?? '', a.serialNumber ?? '', a.quantity, a.unitOfMeasure, tgl(a.acquisitionDate), a.acquisitionMethod, a.fundingSource.name, a.donorName ?? '', Number(a.acquisitionCost), nb(a).nilaiBuku, LABEL_KONDISI[a.condition], a.status, a.attributes ? JSON.stringify(a.attributes) : '']));
  }
  if (jenis === 'nilai-buku') {
    const rows = await aset();
    return csvResponse('nilai-buku.csv', ['Kode', 'Nama', 'Unit', 'Harga', 'Residu', 'Umur (thn)', 'Bulan berjalan', 'Susut/bulan', 'Akumulasi', 'Nilai buku', 'Per tanggal'],
      rows.map((a) => { const s = nb(a); return [a.inventoryCode, a.name, a.ownerUnit.nama, Number(a.acquisitionCost), Number(a.residualValue ?? 0), a.usefulLifeYears ?? '', s.bulanBerjalan, s.susutPerBulan, s.akumulasi, s.nilaiBuku, tgl(hariIni)]; }));
  }
  if (jenis === 'sumber-dana') {
    const rows = await aset();
    const peta = new Map<string, { n: number; nilai: number; buku: number }>();
    for (const a of rows) {
      const k = `${a.ownerUnit.nama}|${a.fundingSource.name}`;
      const v = peta.get(k) ?? { n: 0, nilai: 0, buku: 0 };
      v.n += a.quantity; v.nilai += Number(a.acquisitionCost); v.buku += nb(a).nilaiBuku;
      peta.set(k, v);
    }
    return csvResponse('rekap-sumber-dana.csv', ['Unit', 'Sumber dana', 'Jumlah barang', 'Nilai perolehan', 'Nilai buku'], [...peta.entries()].map(([k, v]) => [...k.split('|'), v.n, v.nilai, Math.round(v.buku)]));
  }
  if (jenis === 'kondisi') {
    const rows = await aset();
    const peta = new Map<string, Record<string, number>>();
    for (const a of rows) {
      const k = `${a.ownerUnit.nama}|${a.location?.roomUsage ?? '-'}`;
      const v = peta.get(k) ?? { Baik: 0, RusakRingan: 0, RusakBerat: 0, Hilang: 0 };
      v[a.condition] += a.quantity;
      peta.set(k, v);
    }
    return csvResponse('rekap-kondisi.csv', ['Unit', 'Jenis ruang', 'Baik', 'Rusak ringan', 'Rusak berat', 'Hilang'], [...peta.entries()].map(([k, v]) => [...k.split('|'), v.Baik, v.RusakRingan, v.RusakBerat, v.Hilang]));
  }
  if (jenis === 'kerusakan') {
    const rows = await prisma.damageReport.findMany({ where: unitIds ? { OR: [{ asset: { ownerUnitId: { in: unitIds } } }, { location: { unitId: { in: unitIds } } }] } : {}, include: { asset: true, location: true, reporter: { include: { person: true } }, vendor: true }, orderBy: { createdAt: 'desc' } });
    return csvResponse('laporan-kerusakan.csv', ['Kode', 'Tanggal', 'Aset', 'Lokasi', 'Pelapor', 'Tingkat', 'Uraian', 'Status', 'Vendor', 'Biaya', 'Selesai', 'Catatan'],
      rows.map((r) => [r.code, tgl(r.createdAt), r.asset?.name ?? '', r.location?.name ?? '', r.reporter.person.fullName, r.severity, r.description, r.status, r.vendor?.name ?? '', Number(r.cost ?? 0), tgl(r.resolvedAt), r.resolutionNote ?? '']));
  }
  if (jenis === 'wakaf') {
    const rows = (await aset()).filter((a) => a.fundingSource.code === 'WAKAF' || a.acquisitionMethod === 'Wakaf');
    return csvResponse('aset-wakaf.csv', ['Kode', 'Nama', 'Unit', 'Lokasi', 'Pemberi (wakif)', 'No. AIW', 'Nazhir', 'No. sertifikat', 'Luas m2', 'Tgl', 'Nilai'],
      rows.map((a) => { const at = (a.attributes ?? {}) as Record<string, string>; return [a.inventoryCode, a.name, a.ownerUnit.nama, a.location?.name ?? '', a.donorName ?? '', at.noAIW ?? '', at.nazhir ?? at.atasNama ?? '', at.noSertifikat ?? '', at.luasM2 ?? '', tgl(a.acquisitionDate), Number(a.acquisitionCost)]; }));
  }
  if (jenis === 'ruang') {
    const lokasi = await prisma.assetLocation.findMany({ where: { type: { in: ['Ruang', 'Area'] }, ...(unitIds ? { OR: [{ unitId: { in: unitIds } }, { unitId: null }] } : {}) }, include: { unit: true, assets: { where: { status: { not: 'Dihapus' } }, select: { quantity: true } } }, orderBy: { code: 'asc' } });
    return csvResponse('data-ruang.csv', ['Kode', 'Nama ruang', 'Unit', 'Jenis ruang', 'Luas m2', 'Kapasitas', 'Kondisi', 'Jumlah sarana'],
      lokasi.map((l) => [l.code, l.name, l.unit?.nama ?? 'Bersama', l.roomUsage ?? '', l.areaM2 ? Number(l.areaM2) : '', l.capacity ?? '', l.condition ? LABEL_KONDISI[l.condition] : '', l.assets.reduce((s, a) => s + a.quantity, 0)]));
  }
  if (jenis === 'persediaan') {
    const rows = await prisma.consumableItem.findMany({ where: unitIds ? { unitId: { in: unitIds } } : {}, orderBy: { name: 'asc' } });
    return csvResponse('persediaan.csv', ['Nama', 'Satuan', 'Stok', 'Stok minimum', 'Perlu belanja', 'Gudang'], rows.map((r) => [r.name, r.unitOfMeasure, r.stock, r.minStock, r.stock <= r.minStock ? 'Ya' : '', r.storage ?? '']));
  }
  return new Response('Jenis laporan tidak dikenal.', { status: 404 });
}
