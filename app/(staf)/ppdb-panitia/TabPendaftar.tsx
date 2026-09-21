import { prisma } from '@/lib/prisma';
import { Avatar, Badge, Kosong, Tabel, Pagination, UKURAN_HALAMAN, satu, bacaHalaman, type SearchParams } from '@/components';
import { DaftarPpdb } from './DaftarPpdb';

function hrefPendaftar(params: Record<string, string>) {
  const qs = new URLSearchParams({ tab: 'pendaftar', ...params });
  for (const [k, v] of [...qs.entries()]) if (!v) qs.delete(k);
  return `/ppdb-panitia?${qs.toString()}`;
}

/** Seluruh pendaftar, difilter lewat query param `q` (bukan state klien). */
export async function TabPendaftar({ searchParams }: { searchParams: SearchParams }) {
  const q = satu(searchParams.q);
  const halaman = bacaHalaman(searchParams);
  const where = q
    ? { OR: [{ fullName: { contains: q } }, { registrationNumber: { contains: q } }] }
    : undefined;

  const [total, pendaftar] = await Promise.all([
    prisma.applicant.count({ where }),
    prisma.applicant.findMany({
      where,
      orderBy: { registeredAt: 'desc' },
      skip: (halaman - 1) * UKURAN_HALAMAN,
      take: UKURAN_HALAMAN,
    }),
  ]);
  const totalHalaman = Math.max(1, Math.ceil(total / UKURAN_HALAMAN));

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <h3 className="card-judul" style={{ marginBottom: 0 }}>Seluruh pendaftar</h3>
        <form method="get" style={{ display: 'flex' }}>
          <input type="hidden" name="tab" value="pendaftar" />
          <input className="field" name="q" defaultValue={q} placeholder="Cari nama / no. pendaftaran" style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--garis)', minWidth: 230 }} />
        </form>
      </div>
      {pendaftar.length === 0 ? (
        <Kosong pesan="Belum ada pendaftar yang cocok." />
      ) : (
        <Tabel kolom={['Pendaftar', 'Pilihan unit', 'Asal sekolah', { label: 'Nilai', num: true }, 'Status']}>
          {pendaftar.map((p) => (
            <tr key={String(p.id)}>
              <td>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Avatar nama={p.fullName} size={30} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.fullName}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>{p.registrationNumber} · {p.registeredAt.toLocaleDateString('id-ID')}</div>
                  </div>
                </div>
              </td>
              <td>{p.choice}</td>
              <td>{p.previousSchool ?? '-'}</td>
              <td className="num" style={{ fontWeight: 700 }}>{p.score ? Number(p.score).toFixed(1) : '-'}</td>
              <td><Badge status={p.status} /></td>
            </tr>
          ))}
        </Tabel>
      )}
      <Pagination
        halaman={halaman}
        totalHalaman={totalHalaman}
        total={total}
        jumlahBaris={pendaftar.length}
        ukuranHalaman={UKURAN_HALAMAN}
        buatHref={(p) => hrefPendaftar({ q, halaman: String(p) })}
      />
      <div style={{ marginTop: 18 }}>
        <DaftarPpdb />
      </div>
    </div>
  );
}
