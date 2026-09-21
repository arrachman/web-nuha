import { prisma } from '@/lib/prisma';
import { Badge, Kosong } from '@/components';

const formatTgl = (tgl: Date) => tgl.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

/** Tab Kepesantrenan: penempatan asrama, riwayat setoran hafalan, ta'zir, dan izin keluar. */
export async function TabKepesantrenan({ santriId }: { santriId: bigint }) {
  const [santri, setoran, tazir, izin] = await Promise.all([
    prisma.santri.findUnique({ where: { id: santriId }, include: { room: { include: { dormitory: true } } } }),
    prisma.memorization.findMany({ where: { studentId: santriId }, orderBy: { date: 'desc' } }),
    prisma.discipline.findMany({ where: { studentId: santriId }, orderBy: { date: 'desc' } }),
    prisma.leavePermit.findMany({ where: { studentId: santriId }, orderBy: { departedAt: 'desc' } }),
  ]);
  if (!santri) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="grid g2">
        <div className="inset">
          <div className="label">Penempatan</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--hijau-gelap)', marginTop: 6 }}>
            {santri.room ? `Asrama ${santri.room.dormitory.name} · Kamar ${santri.room.code}` : 'Belum ditempatkan di asrama'}
          </div>
          <div className="muted" style={{ marginTop: 3 }}>Program {santri.program ?? '-'} · status {santri.status}</div>
        </div>
        <div className="inset">
          <div className="label">Hafalan Al-Qur&apos;an</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--hijau)', fontFamily: 'var(--font-lora), serif', marginTop: 6 }}>
            {setoran.length} setoran tercatat
          </div>
          <div className="muted" style={{ marginTop: 6 }}>
            {setoran[0] ? `Setoran terakhir ${formatTgl(setoran[0].date)} · ${setoran[0].chapter} ayat ${setoran[0].verses}` : 'Belum ada setoran tercatat.'}
          </div>
        </div>
      </div>

      <div>
        <h3 className="card-judul">Riwayat setoran</h3>
        {setoran.length === 0
          ? <Kosong pesan="Belum ada riwayat setoran hafalan." />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {setoran.map((k) => (
                <div key={String(k.id)} className="inset" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--hijau)', width: 92 }}>{formatTgl(k.date)}</div>
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{k.chapter}</span>{' '}
                    <span className="muted">ayat {k.verses} · {k.type}</span>
                  </div>
                  <span className="badge badge-hijau">{k.score}</span>
                  <div className="muted" style={{ fontSize: 12 }}>{k.examiner}</div>
                </div>
              ))}
            </div>
          )}
      </div>

      {tazir.length > 0 && (
        <div>
          <h3 className="card-judul">Catatan ta&apos;zir</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tazir.map((t) => (
              <div key={String(t.id)} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 14px', borderRadius: 12, background: '#FEF2F2', border: '1px solid #F0BFBF', flexWrap: 'wrap' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#991B1B', width: 92 }}>{formatTgl(t.date)}</div>
                <div style={{ flex: 1, minWidth: 160, fontSize: 13 }}>{t.violation} — <span className="muted">{t.sanction ?? '-'}</span></div>
                <span className="badge badge-merah">{t.points} poin</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {izin.length > 0 && (
        <div>
          <h3 className="card-judul">Riwayat izin keluar</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {izin.map((z) => (
              <div key={String(z.id)} className="inset" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--hijau)', width: 62 }}>{z.code}</div>
                <div style={{ flex: 1, minWidth: 160, fontSize: 13 }}>
                  {z.reason}
                  <div className="muted" style={{ fontSize: 11.5 }}>
                    {z.departedAt.toLocaleDateString('id-ID')} → {z.returnedAt ? z.returnedAt.toLocaleDateString('id-ID') : 'belum kembali'}
                  </div>
                </div>
                <Badge status={z.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
