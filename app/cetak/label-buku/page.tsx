import { redirect } from 'next/navigation';
import QRCode from 'qrcode';
import { readSession, isSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { SearchParams } from '@/components';
import { TombolCetak } from '../TombolCetak';

/** Ambil semua nilai id[] dari searchParams sebagai BigInt yang valid. */
function ambilId(sp: SearchParams): bigint[] {
  const mentah = sp.id;
  const daftar = Array.isArray(mentah) ? mentah : mentah ? [mentah] : [];
  return daftar.filter((v) => /^\d+$/.test(v)).map((v) => BigInt(v));
}

/**
 * Lembar cetak label eksemplar perpustakaan (A4, 3 kolom × 8 baris = 24 label).
 * Label ±70×36mm: QR kode eksemplar di kiri; kanan nama perpustakaan unit,
 * judul buku, kode eksemplar monospace besar, dan lokasi rak.
 */
export default async function LabelBukuCetakPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await readSession();
  if (!session) redirect('/login');
  if (!isSuperAdmin(session)) {
    const boleh = await prisma.menuRole.count({
      where: { menu: { key: 'perpustakaan' }, role: { key: { in: session.peran } } },
    });
    if (boleh === 0) redirect('/');
  }

  const sp = await searchParams;
  const ids = ambilId(sp);

  if (ids.length === 0) {
    return (
      <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <div className="cetak-bar">
          <TombolCetak />
          <span>0 label</span>
        </div>
        <p>Pilih eksemplar dulu dari tab Cetak Label di modul Perpustakaan.</p>
      </main>
    );
  }

  const copies = await prisma.bookCopy.findMany({
    where: { id: { in: ids } },
    include: { book: { include: { unit: true } } },
    orderBy: { kode: 'asc' },
  });

  const label = await Promise.all(
    copies.map(async (c) => ({
      id: String(c.id),
      kode: c.kode,
      judul: c.book.judul,
      rak: c.book.rak,
      unitNama: c.book.unit.nama,
      qr: await QRCode.toString(c.kode, { type: 'svg', margin: 1, width: 110 }),
    })),
  );

  return (
    <main style={{ padding: 16, fontFamily: 'system-ui, sans-serif', color: '#111' }}>
      <style>{`
        .label-qr svg { width: 100%; height: 100%; display: block; }
        @media print { @page { size: A4; margin: 8mm; } }
      `}</style>
      <div className="cetak-bar">
        <TombolCetak />
        <span>{label.length} label · A4, 24 label per lembar</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4mm' }}>
        {label.map((l) => (
          <div
            key={l.id}
            style={{
              width: '70mm',
              height: '36mm',
              border: '1px dashed #999',
              borderRadius: 3,
              padding: '3mm',
              display: 'flex',
              gap: '3mm',
              alignItems: 'center',
              boxSizing: 'border-box',
              overflow: 'hidden',
              breakInside: 'avoid',
            }}
          >
            <div className="label-qr" style={{ width: '27mm', height: '27mm', flex: '0 0 auto' }} dangerouslySetInnerHTML={{ __html: l.qr }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                Perpustakaan {l.unitNama}
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  lineHeight: 1.25,
                  margin: '1mm 0',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {l.judul}
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700 }}>{l.kode}</div>
              <div style={{ fontSize: 9, color: '#444' }}>Rak {l.rak || '-'}</div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
