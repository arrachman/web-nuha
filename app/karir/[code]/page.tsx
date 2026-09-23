import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

const LABEL_TIPE: Record<string, string> = { Guru: 'Guru', Staf: 'Staf', Asatidz: 'Asatidz', Musyrif: 'Musyrif/Musyrifah' };

export const dynamic = 'force-dynamic';

export default async function DetailLowonganPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const job = await prisma.jobPosting.findFirst({
    where: { code, deletedAt: null },
    include: { unit: true, documents: { orderBy: { id: 'asc' } } },
  });
  if (!job) notFound();

  const now = new Date();
  const dibuka = job.status === 'Open' && now >= job.openAt && now <= job.closeAt;

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '46px 24px 90px' }}>
      <div style={{ marginBottom: 18 }}>
        <Link href="/karir" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none' }}>&larr; Kembali ke daftar lowongan</Link>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#E8973A' }}>
        {LABEL_TIPE[job.type] ?? job.type} · {job.unit.nama}
      </div>
      <h1 style={{ margin: '8px 0 6px' }}>{job.title}</h1>
      <div style={{ fontSize: 13.5, color: '#6B7280', marginBottom: 22 }}>
        {job.employmentType} · Kuota {job.quota} orang · Pendidikan minimal {job.minEducation}
        {job.genderReq ? ` · Khusus ${job.genderReq === 'P' ? 'perempuan' : 'laki-laki'}` : ''}
      </div>

      {!dibuka && (
        <div className="alert alert-peringatan" style={{ marginBottom: 18 }}>
          Lowongan ini sedang tidak menerima lamaran baru.
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Deskripsi Pekerjaan</h2>
        <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{job.description}</p>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Persyaratan</h2>
        <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{job.requirements}</p>
      </div>
      {job.benefits && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Fasilitas</h2>
          <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{job.benefits}</p>
        </div>
      )}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Berkas yang Perlu Disiapkan</h2>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {job.documents.map((d) => (
            <li key={d.code} style={{ fontSize: 13.5, marginBottom: 4 }}>
              {d.label} {d.required ? '(wajib)' : '(opsional)'} — maks {Math.round(d.maxSizeKb / 1024) || 1} MB, format {d.accept}
            </li>
          ))}
        </ul>
      </div>

      {dibuka ? (
        <Link href={`/karir/${job.code}/daftar`} className="btn" style={{ display: 'inline-block' }}>Lamar Sekarang</Link>
      ) : (
        <button className="btn" disabled>Pendaftaran Ditutup</button>
      )}
    </div>
  );
}
