import { Card, Avatar, Kosong, ProgressBar } from '@/components';
import { hitungPoinSantri, tingkatUntuk } from './poin';

const MEDALI = ['#E8973A', '#9CA3AF', '#B45309']; // emas, perak, perunggu — 3 teratas

export async function TabPeringkat() {
  const santri = await hitungPoinSantri();
  const top = santri.slice(0, 20);
  const maxPoin = santri[0]?.poin ?? 0;

  return (
    <Card
      judul="Papan peringkat santri"
      sub="Poin dihitung dari akumulasi Nilai.akhir seluruh mata pelajaran — bukan angka tetap."
    >
      {top.length === 0 ? (
        <Kosong pesan="Belum ada data nilai untuk dihitung peringkatnya." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {top.map((s, i) => {
            const tingkat = tingkatUntuk(s.poin, maxPoin);
            const medali = i < 3 ? MEDALI[i] : '#F0EDE4';
            const medaliFg = i < 3 ? '#FFFFFF' : '#4B5563';
            const w = maxPoin > 0 ? Math.round((s.poin / maxPoin) * 100) : 0;
            return (
              <div
                key={s.id}
                style={{
                  display: 'flex', gap: 14, alignItems: 'center', padding: '13px 16px', borderRadius: 13,
                  border: '1px solid var(--krem-4)', background: 'var(--krem)', flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    width: 30, height: 30, borderRadius: 9, background: medali, color: medaliFg,
                    display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700, flex: '0 0 auto',
                  }}
                >
                  {i + 1}
                </div>
                <Avatar nama={s.nama} size={34} />
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{s.nama}</div>
                  <div className="muted">{s.kelas}</div>
                  <div style={{ marginTop: 6 }}><ProgressBar pct={w} warna={tingkat.warna} /></div>
                </div>
                <span className="badge" style={{ color: tingkat.warna }}>{tingkat.nama}</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--hijau-gelap)', minWidth: 96, textAlign: 'right' }}>
                  {s.poin.toLocaleString('id-ID')} poin
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
