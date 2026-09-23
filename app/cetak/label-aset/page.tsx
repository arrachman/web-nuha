import { redirect } from 'next/navigation';
import { readSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { izinSarpras, whereAsetTerlihat } from '@/lib/aset/akses';
import { qrSvg } from '@/lib/aset/qr';
import { TombolCetak } from '../TombolCetak';

/**
 * Label aset A4 24 per lembar (3 × 8, ±70 × 36 mm) — logo/unit, nama, kode, QR
 * berisi URL /a/<qrToken> (token acak, 04 §4).
 */
export default async function LabelAsetPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await readSession();
  if (!session) redirect('/login');
  const izin = await izinSarpras(session);
  if (!izin.view) redirect('/');
  const sp = await searchParams;
  const ids = (Array.isArray(sp.id) ? sp.id : sp.id ? [sp.id] : []).filter((v) => /^\d+$/.test(v)).map((v) => BigInt(v));
  const aset = await prisma.asset.findMany({
    where: { ...(await whereAsetTerlihat(session, izin)), ...(ids.length ? { id: { in: ids } } : { status: { not: 'Dihapus' } }) },
    include: { ownerUnit: true, location: true }, orderBy: { inventoryCode: 'asc' }, take: 240,
  });
  const label = await Promise.all(aset.map(async (a) => ({ a, svg: await qrSvg(`/a/${a.qrToken}`, 110) })));

  return (
    <>
      <div className="cetak-bar"><TombolCetak /><span style={{ fontSize: 13 }}>{label.length} label · A4, 24 label per lembar</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2mm' }}>
        {label.map(({ a, svg }) => (
          <div key={String(a.id)} data-testid="label-aset" style={{ border: '1px dashed #bbb', height: '34mm', padding: '2mm', display: 'flex', gap: '2mm', alignItems: 'center', breakInside: 'avoid', overflow: 'hidden' }}>
            <div style={{ width: '28mm', flex: '0 0 28mm' }} dangerouslySetInnerHTML={{ __html: svg.replace(/width="\d+" height="\d+"/, 'width="100%" height="100%"') }} />
            <div style={{ fontSize: '8pt', lineHeight: 1.25, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '7pt', letterSpacing: 0.5 }}>NURUL HUDA · {a.ownerUnit.nama.toUpperCase()}</div>
              <div style={{ fontWeight: 700, margin: '1mm 0' }}>{a.name}</div>
              <div style={{ fontFamily: 'monospace', fontSize: '7pt' }}>{a.inventoryCode}</div>
              <div style={{ fontSize: '7pt', color: '#555' }}>{a.location?.name ?? ''}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
