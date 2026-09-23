import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readSession } from '@/lib/auth';
import { can } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { LABEL_KONDISI } from '@/lib/aset/konstanta';
import { PindaiShell } from '../PindaiShell';

export const dynamic = 'force-dynamic';

/**
 * Hasil pindai QR aset (04 §4). Tanpa login: halaman minimal (nama, lokasi,
 * tombol lapor yang meminta login). Dengan login + izin: tautan ke detail lengkap.
 */
export default async function PindaiAsetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[\w-]{8,40}$/.test(token)) notFound();
  const aset = await prisma.asset.findUnique({ where: { qrToken: token }, include: { location: true, ownerUnit: true } });
  if (!aset || aset.status === 'Dihapus') notFound();
  const session = await readSession();
  const bisaLihat = session ? await can(session, 'sarpras.view') : false;
  const lapor = `/lapor-kerusakan?aset=${aset.qrToken}`;

  return (
    <PindaiShell>
      <h1 style={{ margin: '0 0 6px', fontSize: 24 }}>{aset.name}</h1>
      <div className="card" style={{ fontSize: 14, marginBottom: 14 }}>
        <div><span className="muted">Kode:</span> <span style={{ fontFamily: 'monospace' }}>{aset.inventoryCode}</span></div>
        <div><span className="muted">Lokasi:</span> {aset.location?.name ?? '-'}</div>
        <div><span className="muted">Unit:</span> {aset.ownerUnit.nama}</div>
        {session && <div><span className="muted">Kondisi:</span> {LABEL_KONDISI[aset.condition]}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Link href={session ? lapor : `/login?next=${encodeURIComponent(lapor)}`} className="btn" style={{ textAlign: 'center' }}>Laporkan kerusakan</Link>
        {bisaLihat && <Link href={`/sarpras/aset/${aset.id}`} className="btn-sekunder" style={{ textAlign: 'center' }}>Lihat detail aset</Link>}
        {!session && <p className="muted" style={{ fontSize: 12.5, textAlign: 'center' }}>Pelaporan membutuhkan login pegawai/guru.</p>}
      </div>
    </PindaiShell>
  );
}
