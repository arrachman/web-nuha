import { prisma } from '@/lib/prisma';
import type { SessionPayload } from '@/lib/auth';
import { BarHorizontal, Kosong } from '@/components';

const WARNA_KELOMPOK: Record<string, { bg: string; fg: string; bar: string }> = {
  A: { bg: '#DBEAFE', fg: '#1E40AF', bar: '#1D4ED8' },
  B: { bg: '#DCF0E3', fg: '#0F6B3D', bar: '#0F6B3D' },
  C: { bg: '#FEF3C7', fg: '#92400E', bar: '#E8973A' },
};

/** Tab struktur kurikulum: proporsi beban belajar per kelompok + tabel mapel, dicari lewat ?q=. */
export async function TabStruktur({
  searchParams,
  session,
}: {
  searchParams: Record<string, string | string[] | undefined>;
  session: SessionPayload;
}) {
  const raw = searchParams.q;
  const q = (Array.isArray(raw) ? raw[0] : raw ?? '').trim();
  const mapel = await prisma.mataPelajaran.findMany({ orderBy: [{ kelompok: 'asc' }, { nama: 'asc' }] });

  const qLower = q.toLowerCase();
  const baris = mapel.filter((m) => `${m.nama} ${m.guru ?? ''} ${m.kelompok}`.toLowerCase().includes(qLower));

  const totalJp = mapel.reduce((total, item) => total + item.jp, 0);
  const kelompokBar = ['A. Muatan Nasional', 'B. Muatan Pesantren', 'C. Pengembangan Diri'].map((label) => {
    const jp = mapel.filter((m) => m.kelompok === label).reduce((total, item) => total + item.jp, 0);
    const warna = WARNA_KELOMPOK[label[0]]?.bar ?? '#0F6B3D';
    return { label, nilai: jp, warna };
  }).filter((item) => item.nilai > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card">
        <h3 className="card-judul" style={{ marginBottom: 14 }}>Proporsi beban belajar per pekan</h3>
        {totalJp > 0
          ? <BarHorizontal data={kelompokBar} satuan=" JP" />
          : <Kosong pesan="Belum ada data mata pelajaran." />}
      </div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <h3 className="card-judul">Struktur kurikulum</h3>
            <p className="card-sub">Baris bertanda hijau adalah mapel yang Anda ampu.</p>
          </div>
          <form method="get" action="/kurikulum" className="field" style={{ margin: 0, minWidth: 220 }}>
            <input type="hidden" name="tab" value="struktur" />
            <input name="q" defaultValue={q} placeholder="Cari mapel / guru" />
          </form>
        </div>
        {baris.length === 0 ? <Kosong pesan="Tidak ada mapel yang cocok." /> : (
          <div className="tabel-wrap">
            <table>
              <thead>
                <tr>
                  <th>Kelompok</th><th>Mata pelajaran</th><th className="num">JP/pekan</th>
                  <th>Pengampu</th><th className="num">KKM</th><th>Acuan</th>
                </tr>
              </thead>
              <tbody>
                {baris.map((m) => {
                  const warna = WARNA_KELOMPOK[m.kelompok[0]] ?? WARNA_KELOMPOK.C;
                  const milik = !!m.guru && !!session.nama && m.guru.trim() === session.nama.trim();
                  return (
                    <tr key={m.id}>
                      <td><span className="badge" style={{ background: warna.bg, color: warna.fg }}>{m.kelompok}</span></td>
                      <td>
                        {m.nama}
                        {milik && <span className="badge badge-hijau" style={{ marginLeft: 8 }}>Diampu Anda</span>}
                      </td>
                      <td className="num">{m.jp}</td>
                      <td className="muted">{m.guru ?? '-'}</td>
                      <td className="num">{m.kkm}</td>
                      <td className="muted">{m.kurikulum ?? '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
