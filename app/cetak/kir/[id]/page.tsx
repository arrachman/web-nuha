import { notFound, redirect } from 'next/navigation';
import { readSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { izinSarpras } from '@/lib/aset/akses';
import { qrSvg } from '@/lib/aset/qr';
import { LABEL_KONDISI } from '@/lib/aset/konstanta';
import { TombolCetak } from '../../TombolCetak';

/** Kartu Inventaris Ruangan — daftar aset, jumlah, kondisi + QR ruang untuk ditempel di pintu (04 §4, §7). */
export default async function KirPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await readSession();
  if (!session) redirect('/login');
  const izin = await izinSarpras(session);
  if (!izin.view) redirect('/');
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const ruang = await prisma.assetLocation.findUnique({
    where: { id: Number(id) },
    include: { unit: true, parent: true, assets: { where: { status: { not: 'Dihapus' } }, include: { category: true }, orderBy: { inventoryCode: 'asc' } } },
  });
  if (!ruang) notFound();
  const svg = await qrSvg(`/r/${ruang.qrToken}`, 130);
  const pic = ruang.picStaffId ? await prisma.staff.findUnique({ where: { id: ruang.picStaffId }, include: { person: true } }) : null;
  const sel = { border: '1px solid #333', padding: '4px 6px', fontSize: '9pt' } as const;

  return (
    <>
      <div className="cetak-bar"><TombolCetak /></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 700, letterSpacing: 1, fontSize: '10pt' }}>YAYASAN PENDIDIKAN ISLAM NURUL HUDA MERGOSONO</div>
          <h2 style={{ margin: '4px 0' }}>KARTU INVENTARIS RUANGAN (KIR)</h2>
          <table style={{ fontSize: '10pt' }}><tbody>
            <tr><td>Ruang</td><td>: <b>{ruang.name}</b> ({ruang.code})</td></tr>
            <tr><td>Unit</td><td>: {ruang.unit?.nama ?? 'Bersama'}{ruang.parent ? ` · ${ruang.parent.name}` : ''}</td></tr>
            <tr><td>Penanggung jawab</td><td>: {pic?.person.fullName ?? '-'}</td></tr>
          </tbody></table>
        </div>
        <div style={{ textAlign: 'center', fontSize: '8pt' }}><div dangerouslySetInnerHTML={{ __html: svg }} />Scan untuk lapor kerusakan</div>
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: 12 }} data-testid="tabel-kir">
        <thead><tr>{['No', 'Kode inventaris', 'Nama barang', 'Merk', 'Tahun', 'Jumlah', 'Baik', 'Rusak ringan', 'Rusak berat'].map((h) => <th key={h} style={{ ...sel, background: '#eee' }}>{h}</th>)}</tr></thead>
        <tbody>
          {ruang.assets.map((a, i) => (
            <tr key={String(a.id)}>
              <td style={sel}>{i + 1}</td><td style={{ ...sel, fontFamily: 'monospace' }}>{a.inventoryCode}</td><td style={sel}>{a.name}</td><td style={sel}>{a.brand ?? ''}</td>
              <td style={sel}>{a.acquisitionDate.getFullYear()}</td><td style={sel}>{a.quantity} {a.unitOfMeasure}</td>
              {(['Baik', 'RusakRingan', 'RusakBerat'] as const).map((k) => <td key={k} style={{ ...sel, textAlign: 'center' }}>{a.condition === k ? a.quantity : ''}</td>)}
            </tr>
          ))}
          {ruang.assets.length === 0 && <tr><td colSpan={9} style={sel}>Belum ada aset tercatat di ruang ini.</td></tr>}
        </tbody>
      </table>
      <p style={{ fontSize: '8pt', marginTop: 8 }}>Kondisi: {Object.values(LABEL_KONDISI).join(' / ')} · dicetak {new Date().toLocaleDateString('id-ID')}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 30, fontSize: '10pt' }}>
        <div>Mengetahui,<br />Kepala Unit<br /><br /><br />(........................)</div>
        <div>Penanggung jawab ruang<br /><br /><br /><br />({pic?.person.fullName ?? '........................'})</div>
      </div>
    </>
  );
}
