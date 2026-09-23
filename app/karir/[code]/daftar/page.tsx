import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Wizard } from './Wizard';

export const dynamic = 'force-dynamic';

export default async function DaftarLowonganPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const job = await prisma.jobPosting.findFirst({
    where: { code, deletedAt: null },
    include: { documents: { orderBy: { id: 'asc' } } },
  });
  if (!job) notFound();

  const now = new Date();
  const dibuka = job.status === 'Open' && now >= job.openAt && now <= job.closeAt;
  if (!dibuka) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '46px 24px 90px' }}>
        <div className="alert alert-kritis">Lowongan ini sedang tidak menerima lamaran baru.</div>
        <Link href={`/karir/${job.code}`} style={{ fontSize: 13 }}>&larr; Kembali ke detail lowongan</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '46px 24px 90px' }}>
      <div style={{ marginBottom: 18 }}>
        <Link href={`/karir/${job.code}`} style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none' }}>&larr; Kembali ke detail lowongan</Link>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#E8973A' }}>Lamaran Kerja</div>
      <h1 style={{ margin: '8px 0 14px' }}>{job.title}</h1>
      <Wizard
        jobCode={job.code}
        documents={job.documents.map((d) => ({ code: d.code, label: d.label, required: d.required, maxSizeKb: d.maxSizeKb, accept: d.accept }))}
      />
    </div>
  );
}
