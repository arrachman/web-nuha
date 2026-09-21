import { prisma } from '@/lib/prisma';
import { Kosong, Pagination, UKURAN_HALAMAN, satu, bacaHalaman, type SearchParams } from '@/components';
import { ajukanPerangkat, setujuiPerangkat } from './actions';

function hrefPerangkat(params: Record<string, string>) {
  const qs = new URLSearchParams({ tab: 'perangkat', ...params });
  for (const [k, v] of [...qs.entries()]) if (!v) qs.delete(k);
  return `/kurikulum?${qs.toString()}`;
}

/** Tab silabus & modul ajar: guru mengajukan, kepala unit menyetujui. Pencarian lewat ?q=. */
export async function TabPerangkat({ searchParams }: { searchParams: SearchParams }) {
  const q = satu(searchParams.q).trim();
  const halaman = bacaHalaman(searchParams);
  const where = q
    ? { OR: [{ topik: { contains: q } }, { mapel: { contains: q } }, { guru: { contains: q } }, { jenis: { contains: q } }] }
    : undefined;

  const [total, baris] = await Promise.all([
    prisma.perangkatAjar.count({ where }),
    prisma.perangkatAjar.findMany({
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
          <h3 className="card-judul">Silabus, modul ajar & program</h3>
          <p className="card-sub">Guru menyusun lalu mengajukan; kepala unit menyetujui sebelum dipakai mengajar.</p>
        </div>
        <form method="get" action="/kurikulum" className="field" style={{ margin: 0, minWidth: 220 }}>
          <input type="hidden" name="tab" value="perangkat" />
          <input name="q" defaultValue={q} placeholder="Cari topik / mapel / guru" />
        </form>
      </div>
      {baris.length === 0 ? <Kosong pesan="Tidak ada perangkat ajar yang cocok." /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {baris.map((p) => (
            <div
              key={p.id}
              className="inset"
              style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', borderLeft: '4px solid var(--hijau-gelap)' }}
            >
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.topik}</div>
                <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                  {p.kode} · {p.jenis} · {p.mapel} · kelas {p.kelas} · {p.pertemuan} pertemuan
                </div>
              </div>
              <div className="muted" style={{ fontSize: 12, minWidth: 150 }}>{p.guru}</div>
              <span className={`badge ${p.status === 'Disetujui' ? 'badge-hijau' : p.status === 'Menunggu review' ? 'badge-kuning' : 'badge-netral'}`}>
                {p.status}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                {p.status === 'Draf' && (
                  <form action={ajukanPerangkat}>
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" className="btn">Ajukan review</button>
                  </form>
                )}
                {p.status === 'Menunggu review' && (
                  <form action={setujuiPerangkat}>
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" className="btn-sekunder">Setujui</button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination
        halaman={halaman}
        totalHalaman={totalHalaman}
        total={total}
        jumlahBaris={baris.length}
        ukuranHalaman={UKURAN_HALAMAN}
        buatHref={(p) => hrefPerangkat({ q, halaman: String(p) })}
      />
    </div>
  );
}
