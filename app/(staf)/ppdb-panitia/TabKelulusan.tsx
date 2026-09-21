import type { ApplicantStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { Avatar, Badge, Kosong, Pagination, UKURAN_HALAMAN, bacaHalaman, type SearchParams } from '@/components';

function hrefKelulusan(params: Record<string, string>) {
  const qs = new URLSearchParams({ tab: 'kelulusan', ...params });
  for (const [k, v] of [...qs.entries()]) if (!v) qs.delete(k);
  return `/ppdb-panitia?${qs.toString()}`;
}

/** Pengumuman kelulusan: pendaftar yang sudah lulus, tidak lulus, atau daftar ulang. */
export async function TabKelulusan({ searchParams }: { searchParams: SearchParams }) {
  const halaman = bacaHalaman(searchParams);
  const where = { status: { in: ['Passed', 'Failed', 'Reenrollment'] as ApplicantStatus[] } };

  const [total, pendaftar] = await Promise.all([
    prisma.applicant.count({ where }),
    prisma.applicant.findMany({
      where,
      orderBy: { fullName: 'asc' },
      skip: (halaman - 1) * UKURAN_HALAMAN,
      take: UKURAN_HALAMAN,
    }),
  ]);
  const totalHalaman = Math.max(1, Math.ceil(total / UKURAN_HALAMAN));

  return (
    <div className="card">
      <h3 className="card-judul">Pengumuman kelulusan</h3>
      <p className="card-sub" style={{ marginBottom: 14 }}>
        Daftar ulang dibuka sesuai jadwal PPDB yang ditetapkan panitia.
      </p>
      {pendaftar.length === 0 ? (
        <Kosong pesan="Belum ada pendaftar dengan keputusan kelulusan." />
      ) : (
        <div className="grid g2">
          {pendaftar.map((p) => (
            <div key={String(p.id)} className="inset" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <Avatar nama={p.fullName} size={34} />
              <div style={{ flex: 1, minWidth: 150 }}>
                <div style={{ fontWeight: 600 }}>{p.fullName}</div>
                <div className="muted" style={{ fontSize: 11.5 }}>{p.registrationNumber} · {p.choice}</div>
              </div>
              <Badge status={p.status} />
            </div>
          ))}
        </div>
      )}
      <Pagination
        halaman={halaman}
        totalHalaman={totalHalaman}
        total={total}
        jumlahBaris={pendaftar.length}
        ukuranHalaman={UKURAN_HALAMAN}
        buatHref={(p) => hrefKelulusan({ halaman: String(p) })}
      />
    </div>
  );
}
