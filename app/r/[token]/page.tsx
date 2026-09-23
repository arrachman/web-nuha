import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { LABEL_KONDISI } from '@/lib/aset/konstanta';
import { PindaiShell } from '../../a/PindaiShell';

export const dynamic = 'force-dynamic';

/** Hasil pindai QR ruang (ditempel di pintu bersama KIR): daftar aset di ruang + lapor kerusakan ruang. */
export default async function PindaiRuangPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[\w-]{8,40}$/.test(token)) notFound();
  const ruang = await prisma.assetLocation.findUnique({
    where: { qrToken: token },
    include: { unit: true, assets: { where: { status: { not: 'Dihapus' } }, orderBy: { name: 'asc' } } },
  });
  if (!ruang) notFound();
  const session = await readSession();
  const laporRuang = `/lapor-kerusakan?ruang=${ruang.qrToken}`;
  const tautan = (href: string) => (session ? href : `/login?next=${encodeURIComponent(href)}`);

  return (
    <PindaiShell>
      <h1 style={{ margin: '0 0 4px', fontSize: 24 }}>{ruang.name}</h1>
      <p className="muted" style={{ marginTop: 0 }}>{ruang.code} · {ruang.unit?.nama ?? 'Ruang bersama'}</p>
      <Link href={tautan(laporRuang)} className="btn" style={{ display: 'block', textAlign: 'center', marginBottom: 14 }}>Laporkan kerusakan ruang ini</Link>
      <div className="card">
        <h3 className="card-judul">Barang di ruang ini</h3>
        {ruang.assets.length === 0 ? <p className="muted">Belum ada aset tercatat.</p> : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} data-testid="aset-ruang">
            {ruang.assets.map((a) => (
              <li key={String(a.id)} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '9px 0', borderBottom: '1px solid #F0EDE4', fontSize: 14 }}>
                <span>{a.name} <span className="muted">× {a.quantity}</span>{session && <span className="muted"> · {LABEL_KONDISI[a.condition]}</span>}</span>
                <Link href={tautan(`/lapor-kerusakan?aset=${a.qrToken}`)} style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>Lapor rusak</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PindaiShell>
  );
}
