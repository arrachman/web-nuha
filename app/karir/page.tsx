import Link from 'next/link';
import { prisma } from '@/lib/prisma';

const LABEL_TIPE: Record<string, string> = { Guru: 'Guru', Staf: 'Staf', Asatidz: 'Asatidz', Musyrif: 'Musyrif/Musyrifah' };

// Lowongan dibaca langsung dari DB tiap request — jangan diprerender waktu build.
export const dynamic = 'force-dynamic';

export default async function KarirPage() {
  const now = new Date();
  const lowongan = await prisma.jobPosting.findMany({
    where: { status: 'Open', deletedAt: null, openAt: { lte: now }, closeAt: { gte: now } },
    include: { unit: true },
    orderBy: { closeAt: 'asc' },
  });

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '46px 24px 90px' }}>
      <div style={{ marginBottom: 18 }}>
        <Link href="/" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none' }}>&larr; Kembali ke beranda</Link>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#E8973A' }}>Karir</div>
      <h1 style={{ margin: '8px 0 14px' }}>Lowongan Kerja Pondok Pesantren Nurul Huda</h1>
      <p className="muted" style={{ marginTop: 0, marginBottom: 24 }}>
        Sudah melamar? <Link href="/karir/status">Cek status lamaran</Link> di sini.
      </p>

      {lowongan.length === 0 && (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>Belum ada lowongan yang dibuka saat ini. Silakan cek kembali lain waktu.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {lowongan.map((job) => (
          <Link key={job.code} href={`/karir/${job.code}`} className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0F6B3D', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {LABEL_TIPE[job.type] ?? job.type} · {job.unit.nama}
                </div>
                <h2 style={{ margin: '6px 0 4px', fontSize: 19 }}>{job.title}</h2>
                <div style={{ fontSize: 13, color: '#6B7280' }}>
                  {job.subject ? `${job.subject} · ` : ''}{job.employmentType} · Kuota {job.quota} orang
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                Ditutup {job.closeAt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
