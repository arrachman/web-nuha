import { prisma } from '@/lib/prisma';
import { readSession } from '@/lib/auth';
import { getUnitAktif } from '@/lib/unit-scope';
import { Avatar, Button, ButtonLink, Input, Kosong, Select, Tabel, Pagination, UKURAN_HALAMAN, satu, bacaHalaman, type SearchParams } from '@/components';

const LABEL_STATUS: Record<string, string> = {
  Submitted: 'Terkirim', Screening: 'Diperiksa Berkas', Shortlisted: 'Lolos Administrasi',
  Test: 'Tes', Interview: 'Wawancara', Offered: 'Ditawari', Hired: 'Diterima',
  Rejected: 'Tidak Lolos', Withdrawn: 'Mengundurkan Diri', Reserve: 'Cadangan',
};
const KELAS_BADGE: Record<string, string> = {
  Hired: 'badge-hijau', Offered: 'badge-hijau', Rejected: 'badge-merah', Withdrawn: 'badge-netral',
  Shortlisted: 'badge-biru', Interview: 'badge-biru', Test: 'badge-kuning', Reserve: 'badge-oranye',
};

function hrefPelamar(params: Record<string, string>) {
  const qs = new URLSearchParams({ tab: 'pelamar', ...params });
  for (const [k, v] of [...qs.entries()]) if (!v) qs.delete(k);
  return `/rekrutmen?${qs.toString()}`;
}

export async function TabPelamar({ searchParams }: { searchParams: SearchParams }) {
  const q = satu(searchParams.q);
  const jobId = satu(searchParams.jobId);
  const status = satu(searchParams.status);
  const halaman = bacaHalaman(searchParams);
  const session = await readSession();
  const unitAktif = session ? await getUnitAktif(session) : null;

  const where = {
    ...(q ? { OR: [{ fullName: { contains: q } }, { number: { contains: q } }] } : {}),
    ...(jobId ? { jobId: BigInt(jobId) } : {}),
    ...(status ? { status: status as never } : {}),
    ...(unitAktif != null ? { job: { unitId: unitAktif } } : {}),
  };

  const [total, pelamar, lowongan] = await Promise.all([
    prisma.jobApplication.count({ where }),
    prisma.jobApplication.findMany({
      where, include: { job: true },
      orderBy: { createdAt: 'desc' },
      skip: (halaman - 1) * UKURAN_HALAMAN,
      take: UKURAN_HALAMAN,
    }),
    prisma.jobPosting.findMany({ where: { deletedAt: null, ...(unitAktif != null ? { unitId: unitAktif } : {}) }, orderBy: { createdAt: 'desc' }, select: { id: true, code: true, title: true } }),
  ]);
  const totalHalaman = Math.max(1, Math.ceil(total / UKURAN_HALAMAN));

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <h3 className="card-judul" style={{ marginBottom: 0 }}>Seluruh pelamar</h3>
        <form method="get" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Input type="hidden" name="tab" value="pelamar" />
          <Select name="jobId" defaultValue={jobId} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--garis)' }}>
            <option value="">Semua lowongan</option>
            {lowongan.map((j) => <option key={String(j.id)} value={String(j.id)}>{j.title} ({j.code})</option>)}
          </Select>
          <Select name="status" defaultValue={status} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--garis)' }}>
            <option value="">Semua status</option>
            {Object.entries(LABEL_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Input name="q" defaultValue={q} placeholder="Cari nama / nomor" style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--garis)', minWidth: 200 }} />
          <Button type="submit" varian="sekunder">Cari</Button>
        </form>
      </div>
      {pelamar.length === 0 ? <Kosong pesan="Belum ada pelamar yang cocok." /> : (
        <Tabel kolom={['Pelamar', 'Lowongan', { label: 'Skor', num: true }, 'Status', '']}>
          {pelamar.map((p) => (
            <tr key={String(p.id)}>
              <td>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Avatar nama={p.fullName} size={30} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.fullName}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>{p.number} · {p.createdAt.toLocaleDateString('id-ID')}</div>
                  </div>
                </div>
              </td>
              <td>{p.job.title}</td>
              <td className="num" style={{ fontWeight: 700 }}>{p.totalScore ? Number(p.totalScore).toFixed(1) : '-'}</td>
              <td><span className={`badge ${KELAS_BADGE[p.status] ?? 'badge-netral'}`}>{LABEL_STATUS[p.status] ?? p.status}</span></td>
              <td><ButtonLink href={`/rekrutmen/pelamar/${p.id}`} varian="sekunder" style={{ fontSize: 12.5 }}>Detail</ButtonLink></td>
            </tr>
          ))}
        </Tabel>
      )}
      <Pagination
        halaman={halaman}
        totalHalaman={totalHalaman}
        total={total}
        jumlahBaris={pelamar.length}
        ukuranHalaman={UKURAN_HALAMAN}
        buatHref={(p) => hrefPelamar({ q, jobId, status, halaman: String(p) })}
      />
    </div>
  );
}
