import { prisma } from '@/lib/prisma';
import { Avatar, ProgressBar, Kosong } from '@/components';

/** Kartu asrama: hunian per kamar + avatar musyrif/santri contoh, semua dari Prisma. */
export async function TabAsrama() {
  const asrama = await prisma.dormitory.findMany({
    include: {
      rooms: {
        include: { santri: { include: { person: true } } },
        orderBy: { code: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  if (asrama.length === 0) return <Kosong pesan="Belum ada data asrama." />;

  return (
    <section className="grid g3">
      {asrama.map((a) => {
        const isi = a.rooms.reduce((total, k) => total + k.santri.length, 0);
        const pct = a.capacity > 0 ? Math.round((isi / a.capacity) * 100) : 0;
        const semuaSantri = a.rooms.flatMap((k) => k.santri);
        const avatar4 = semuaSantri.slice(0, 4);
        const sisa = Math.max(0, a.capacity - isi);

        return (
          <div className="card" key={a.id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
              <div>
                <div className="card-judul" style={{ marginBottom: 2 }}>{a.name}</div>
                <div className="muted">Musyrif: {a.supervisor ?? '—'}</div>
              </div>
              <span className={`badge ${a.gender === 'L' ? 'badge-biru' : 'badge-pink'}`}>{a.gender === 'L' ? 'Putra' : 'Putri'}</span>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
                <span className="muted">Hunian</span>
                <strong>{isi} / {a.capacity} · {pct}%</strong>
              </div>
              <ProgressBar pct={pct} />
            </div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {a.rooms.map((k) => (
                <div
                  key={k.id}
                  className="inset"
                  style={{ padding: '7px 4px', textAlign: 'center' }}
                >
                  <div style={{ fontSize: 11.5, fontWeight: 700 }}>{k.code}</div>
                  <div style={{ fontSize: 10 }} className="muted">{k.santri.length}/{k.capacity}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex' }}>
                {avatar4.map((s) => (
                  <div key={String(s.id)} style={{ marginLeft: -6 }}>
                    <Avatar nama={s.person.fullName} size={28} />
                  </div>
                ))}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                Sisa <strong>{sisa} slot</strong> · {a.rooms.length} kamar
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
