import { prisma } from '@/lib/prisma';
import { Card, Kosong, ProgressBar } from '@/components';
import { hitungPoinSantri, TINGKAT, tingkatUntuk } from './poin';

/**
 * Skema tidak punya model poin/badge/mutasi poin. Poin diturunkan dari total Nilai.akhir
 * santri (lihat poin.ts). "Badge" diturunkan dari data nyata yang ada: setiap mata
 * pelajaran punya KKM — santri yang nilai akhirnya mencapai KKM dianggap "lulus badge"
 * mapel tersebut. Tidak ada log mutasi poin bertanggal (Nilai tak punya kolom tanggal),
 * jadi sebagai gantinya ditampilkan kontribusi nilai tertinggi per santri.
 */
export async function TabGamifikasi() {
  const [santri, mapelList] = await Promise.all([
    hitungPoinSantri(),
    prisma.mataPelajaran.findMany({ include: { nilai: { include: { santri: { include: { person: true } } } } }, orderBy: { nama: 'asc' } }),
  ]);
  const maxPoin = santri[0]?.poin ?? 0;

  const distribusi = TINGKAT.map((t) => ({ ...t, jumlah: 0 }));
  santri.forEach((s) => {
    const t = tingkatUntuk(s.poin, maxPoin);
    const bucket = distribusi.find((d) => d.nama === t.nama);
    if (bucket) bucket.jumlah += 1;
  });

  const kontribusi = [...santri]
    .filter((s) => s.poin > 0)
    .sort((a, b) => b.poin - a.poin)
    .slice(0, 10);

  const badges = mapelList.map((m) => {
    const pemilik = m.nilai.filter((n) => Number(n.akhir) >= m.kkm);
    return { mapel: m.nama, guru: m.guru ?? '-', kkm: m.kkm, pemilikN: pemilik.length };
  });
  const totalBadge = badges.reduce((total, b) => total + b.pemilikN, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <Card judul="Tingkatan santri" sub={`${santri.length} santri terdistribusi dari total poin akademik tertinggi ${maxPoin}.`}>
          {santri.length === 0 ? (
            <Kosong />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {distribusi.map((t) => (
                <div key={t.nama}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: t.warna }}>{t.nama}</span>
                    <span className="muted">{t.jumlah} santri</span>
                  </div>
                  <ProgressBar pct={santri.length ? (t.jumlah / santri.length) * 100 : 0} warna={t.warna} />
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card judul="Kontribusi poin tertinggi" sub="Jumlah Nilai.akhir per santri, diurutkan tertinggi.">
          {kontribusi.length === 0 ? (
            <Kosong />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {kontribusi.map((s) => (
                <div key={s.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '11px 13px', borderRadius: 11, background: 'var(--krem)', border: '1px solid var(--krem-4)' }}>
                  <div style={{ flex: 1, minWidth: 170 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{s.nama}</div>
                    <div className="muted">{s.kelas}</div>
                  </div>
                  <span className="badge badge-hijau">{s.poin} poin</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      <Card
        judul="Katalog badge mata pelajaran"
        sub={`${totalBadge} badge telah "diberikan" — badge otomatis terpicu saat nilai akhir santri mencapai KKM mapel.`}
      >
        {badges.length === 0 ? (
          <Kosong />
        ) : (
          <div className="grid g4">
            {badges.map((b) => (
              <div key={b.mapel} className="inset" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontWeight: 700 }}>Juara {b.mapel}</div>
                <div className="muted">{b.guru} · {b.pemilikN} pemilik</div>
                <div className="muted">Kriteria: nilai akhir ≥ KKM ({b.kkm})</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
