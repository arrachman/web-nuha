import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Kosong } from '@/components';

/** Tab capaian pembelajaran: pilih CP lewat ?cp=<kode>, bukan state klien. */
export async function TabCp({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const daftar = await prisma.capaianPembelajaran.findMany({ orderBy: { kode: 'asc' } });
  if (daftar.length === 0) return <Kosong pesan="Belum ada capaian pembelajaran." />;

  const raw = searchParams.cp;
  const kodeAktif = Array.isArray(raw) ? raw[0] : raw;
  const terpilih = daftar.find((c) => c.kode === kodeAktif) ?? daftar[0];

  return (
    <div className="grid" style={{ gridTemplateColumns: '320px 1fr', gap: 14, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {daftar.map((c) => {
          const aktif = c.id === terpilih.id;
          return (
            <Link
              key={c.id}
              href={`/kurikulum?tab=cp&cp=${encodeURIComponent(c.kode)}`}
              className="card inset"
              style={{
                display: 'flex', flexDirection: 'column', gap: 6, textDecoration: 'none',
                borderColor: aktif ? '#0F6B3D' : undefined, background: aktif ? '#F1F7F3' : undefined,
              }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#0F6B3D' }}>{c.kode}</span>
                <span className="badge badge-netral">{c.fase}</span>
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--teks-kuat)' }}>{c.mapel}</div>
            </Link>
          );
        })}
      </div>
      <div className="card" style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#0F6B3D' }}>{terpilih.kode}</span>
          <span className="badge badge-hijau">{terpilih.fase}</span>
        </div>
        <h3 className="card-judul" style={{ marginBottom: 12 }}>{terpilih.mapel}</h3>
        <div className="alert alert-info">{terpilih.capaian}</div>
      </div>
    </div>
  );
}
