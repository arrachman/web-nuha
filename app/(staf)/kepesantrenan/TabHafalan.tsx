import { prisma } from '@/lib/prisma';
import { Avatar, Kosong, ProgressBar } from '@/components';

/** Progres hafalan diukur relatif dari jumlah setoran tercatat per santri — tidak ada
 *  field target/juz di skema, jadi persentase dihitung terhadap santri tersibuk. */
export async function TabHafalan() {
  const [santriTahfidz, setoranTerbaru] = await Promise.all([
    prisma.santri.findMany({
      where: { program: 'Tahfidz' },
      include: {
        person: true,
        kelas: true,
        room: { include: { dormitory: true } },
        memorization: { orderBy: { date: 'desc' } },
      },
    }),
    prisma.memorization.findMany({
      include: { student: { include: { person: true } } },
      orderBy: { date: 'desc' },
      take: 12,
    }),
  ]);

  const daftar = santriTahfidz
    .map((x) => ({ x, jumlah: x.memorization.length, terakhir: x.memorization[0] }))
    .sort((a, b) => b.jumlah - a.jumlah);
  const maxJumlah = Math.max(...daftar.map((d) => d.jumlah), 1);

  return (
    <section className="grid g2" style={{ gridTemplateColumns: '1.3fr 1fr', alignItems: 'start' }}>
      <div className="card">
        <div className="card-judul">Progres hafalan santri program Tahfidz</div>
        {daftar.length === 0 ? (
          <Kosong pesan="Belum ada santri program Tahfidz." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {daftar.map(({ x, jumlah, terakhir }) => {
              const pct = Math.round((jumlah / maxJumlah) * 100);
              return (
                <div key={String(x.id)} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Avatar nama={x.person.fullName} size={32} />
                  <div style={{ flex: 1, minWidth: 170 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{x.person.fullName}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--hijau)' }}>{jumlah} setoran</span>
                    </div>
                    <div style={{ marginTop: 6 }}><ProgressBar pct={pct} /></div>
                    <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                      {x.kelas?.nama ?? '—'} · {x.room?.dormitory.name ?? '—'}
                    </div>
                  </div>
                  <span className="badge badge-hijau">{terakhir ? terakhir.score : 'Belum setor'}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="card">
        <div className="card-judul" style={{ marginBottom: 4 }}>Riwayat setoran terbaru</div>
        <div className="muted" style={{ marginBottom: 12 }}>Penilaian: Mumtaz · Jayyid Jiddan · Jayyid · Maqbul</div>
        {setoranTerbaru.length === 0 ? (
          <Kosong pesan="Belum ada setoran hafalan." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 520, overflowY: 'auto' }}>
            {setoranTerbaru.map((k) => (
              <div key={String(k.id)} className="inset">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{k.student.person.fullName}</span>
                  <span className="muted" style={{ fontSize: 11.5 }}>{k.date.toLocaleDateString('id-ID')}</span>
                </div>
                <div style={{ fontSize: 12.5, marginTop: 3 }}>{k.chapter} ayat {k.verses} · {k.type}</div>
                <div className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>{k.score} — penguji {k.examiner}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
