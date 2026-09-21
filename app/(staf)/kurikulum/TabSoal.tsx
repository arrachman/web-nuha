import { prisma } from '@/lib/prisma';
import { Kosong, Pagination, UKURAN_HALAMAN, satu, bacaHalaman, type SearchParams } from '@/components';

const warnaLevel = (level: string): { bg: string; fg: string } => {
  if (level.startsWith('C2')) return { bg: '#DBEAFE', fg: '#1E40AF' };
  if (level.startsWith('C3')) return { bg: '#DCF0E3', fg: '#0F6B3D' };
  return { bg: '#FEF3C7', fg: '#92400E' };
};

function hrefSoal(params: Record<string, string>) {
  const qs = new URLSearchParams({ tab: 'soal', ...params });
  for (const [k, v] of [...qs.entries()]) if (!v) qs.delete(k);
  return `/kurikulum?${qs.toString()}`;
}

/** Tab bank soal bersama, dicari lewat ?q= — bank ini tumbuh terus tiap mapel/semester. */
export async function TabSoal({ searchParams }: { searchParams: SearchParams }) {
  const q = satu(searchParams.q).trim();
  const halaman = bacaHalaman(searchParams);
  const where = q
    ? { OR: [{ mapel: { contains: q } }, { topik: { contains: q } }, { penulis: { contains: q } }] }
    : undefined;

  const [totalAgregat, total, baris] = await Promise.all([
    prisma.bankSoal.aggregate({ _sum: { butir: true }, _count: { _all: true } }),
    prisma.bankSoal.count({ where }),
    prisma.bankSoal.findMany({
      where,
      orderBy: { kode: 'desc' },
      skip: (halaman - 1) * UKURAN_HALAMAN,
      take: UKURAN_HALAMAN,
    }),
  ]);
  const totalHalaman = Math.max(1, Math.ceil(total / UKURAN_HALAMAN));

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <h3 className="card-judul">Bank soal bersama</h3>
          <p className="card-sub">{totalAgregat._sum.butir ?? 0} butir soal dalam {totalAgregat._count._all} paket, dapat langsung dipakai pada ujian LMS.</p>
        </div>
        <form method="get" action="/kurikulum" className="field" style={{ margin: 0, minWidth: 200 }}>
          <input type="hidden" name="tab" value="soal" />
          <input name="q" defaultValue={q} placeholder="Cari topik / mapel" />
        </form>
      </div>
      {baris.length === 0 ? <Kosong pesan="Tidak ada butir soal yang cocok." /> : (
        <div className="tabel-wrap">
          <table>
            <thead>
              <tr>
                <th>Paket</th><th>Mapel / Topik</th><th>Bentuk</th><th>Level kognitif</th>
                <th className="num">Butir</th><th className="num">Dipakai</th>
              </tr>
            </thead>
            <tbody>
              {baris.map((b) => {
                const warna = warnaLevel(b.level);
                return (
                  <tr key={b.id}>
                    <td className="muted">{b.kode}</td>
                    <td>
                      {b.mapel}
                      <div className="muted" style={{ fontSize: 11.5 }}>{b.topik} · {b.penulis}</div>
                    </td>
                    <td className="muted">{b.tipe}</td>
                    <td><span className="badge" style={{ background: warna.bg, color: warna.fg }}>{b.level}</span></td>
                    <td className="num">{b.butir}</td>
                    <td className="num">{b.dipakai}x</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination
        halaman={halaman}
        totalHalaman={totalHalaman}
        total={total}
        jumlahBaris={baris.length}
        ukuranHalaman={UKURAN_HALAMAN}
        buatHref={(p) => hrefSoal({ q, halaman: String(p) })}
      />
    </div>
  );
}
