import type { ApplicantStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { Avatar, Badge, Kosong, Pagination, UKURAN_HALAMAN, bacaHalaman, type SearchParams } from '@/components';
import { ubahStatusSeleksi } from './actions';

function hrefSeleksi(params: Record<string, string>) {
  const qs = new URLSearchParams({ tab: 'seleksi', ...params });
  for (const [k, v] of [...qs.entries()]) if (!v) qs.delete(k);
  return `/ppdb-panitia?${qs.toString()}`;
}

/** Pendaftar yang masih perlu diverifikasi/diseleksi, dengan aksi keputusan. */
export async function TabSeleksi({ searchParams }: { searchParams: SearchParams }) {
  const halaman = bacaHalaman(searchParams);
  const where = { status: { in: ['New', 'Verification', 'Selection'] as ApplicantStatus[] } };

  const [total, pendaftar] = await Promise.all([
    prisma.applicant.count({ where }),
    prisma.applicant.findMany({
      where,
      orderBy: { registeredAt: 'asc' },
      skip: (halaman - 1) * UKURAN_HALAMAN,
      take: UKURAN_HALAMAN,
    }),
  ]);
  const totalHalaman = Math.max(1, Math.ceil(total / UKURAN_HALAMAN));

  return (
    <div className="card">
      <h3 className="card-judul">Seleksi &amp; verifikasi</h3>
      <p className="card-sub" style={{ marginBottom: 14 }}>
        Tes baca Al-Qur&apos;an, wawancara wali, dan verifikasi berkas. Tetapkan keputusan per pendaftar.
      </p>
      {pendaftar.length === 0 ? (
        <Kosong pesan="Tidak ada pendaftar yang menunggu keputusan." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pendaftar.map((p) => (
            <div key={String(p.id)} className="inset" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <Avatar nama={p.fullName} size={36} />
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 600 }}>{p.fullName}</div>
                <div className="muted" style={{ fontSize: 11.5 }}>
                  {p.registrationNumber} · {p.choice} · nilai {p.score ? Number(p.score).toFixed(1) : '-'}
                </div>
              </div>
              <Badge status={p.status} />
              <div style={{ display: 'flex', gap: 8 }}>
                <form action={ubahStatusSeleksi}>
                  <input type="hidden" name="id" value={String(p.id)} />
                  <input type="hidden" name="aksi" value="lulus" />
                  <button className="btn" type="submit">Luluskan</button>
                </form>
                <form action={ubahStatusSeleksi}>
                  <input type="hidden" name="id" value={String(p.id)} />
                  <input type="hidden" name="aksi" value="tolak" />
                  <button className="btn btn-sekunder" type="submit">Tidak lulus</button>
                </form>
              </div>
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
        buatHref={(p) => hrefSeleksi({ halaman: String(p) })}
      />
    </div>
  );
}
