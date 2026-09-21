import { prisma } from '@/lib/prisma';
import { Avatar, Kosong, kelasStatus } from '@/components';
import { ubahStatusIzin } from './actions';

/** Overdue = izin Disetujui, sudah lewat jadwal kembali, tapi belum ditandai Selesai. */
export async function TabIzin() {
  const izin = await prisma.leavePermit.findMany({
    include: { student: { include: { person: true, room: true } } },
    orderBy: { departedAt: 'desc' },
  });

  const sekarang = new Date();
  const baris = izin.map((z) => ({
    ...z,
    overdue: z.status === 'Approved' && !!z.returnedAt && z.returnedAt < sekarang,
    perluAksi: z.status === 'Pending',
  }));
  const menunggu = baris.filter((z) => z.perluAksi).length;
  const telat = baris.filter((z) => z.overdue).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <section className="grid g3">
        <div className="card">
          <div className="label">Menunggu persetujuan</div>
          <div className="angka" style={{ color: '#E8973A' }}>{menunggu}</div>
        </div>
        <div className="card">
          <div className="label">Telat kembali</div>
          <div className="angka" style={{ color: '#B91C1C' }}>{telat}</div>
        </div>
        <div className="card">
          <div className="label">Alur izin</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.6 }}>Ajukan → Disetujui → Keluar → Kembali</div>
        </div>
      </section>

      {baris.length === 0 ? (
        <Kosong pesan="Belum ada pengajuan izin." />
      ) : (
        <section className="grid g2">
          {baris.map((z) => (
            <div
              key={String(z.id)}
              className="card"
              style={{ borderLeft: `4px solid ${z.overdue ? '#B91C1C' : '#0F6B3D'}`, display: 'flex', flexDirection: 'column', gap: 11 }}
            >
              <div style={{ display: 'flex', gap: 11, alignItems: 'center', flexWrap: 'wrap' }}>
                <Avatar nama={z.student.person.fullName} size={34} />
                <div style={{ flex: 1, minWidth: 130 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{z.student.person.fullName}</div>
                  <div className="muted" style={{ fontSize: 11.5 }}>{z.code} · kamar {z.student.room?.code ?? '—'}</div>
                </div>
                <span className={`badge ${kelasStatus(z.status)}`}>{z.status}</span>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                {z.reason}
                <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>Penjemput: {z.pickupBy ?? '—'}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 12, flexWrap: 'wrap' }}>
                <span>Keluar: <strong>{z.departedAt.toLocaleString('id-ID')}</strong></span>
                <span>Kembali: <strong>{z.returnedAt ? z.returnedAt.toLocaleString('id-ID') : '—'}</strong></span>
              </div>
              {z.overdue && (
                <div className="alert alert-kritis" style={{ padding: '9px 12px', fontSize: 12 }}>
                  Santri belum kembali — sudah melewati batas waktu.
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {z.perluAksi && (
                  <>
                    <form action={ubahStatusIzin}>
                      <input type="hidden" name="id" value={String(z.id)} />
                      <input type="hidden" name="aksi" value="setuju" />
                      <button type="submit" className="btn">Setujui</button>
                    </form>
                    <form action={ubahStatusIzin}>
                      <input type="hidden" name="id" value={String(z.id)} />
                      <input type="hidden" name="aksi" value="tolak" />
                      <button type="submit" className="btn-sekunder" style={{ color: '#991B1B' }}>Tolak</button>
                    </form>
                  </>
                )}
                {z.status !== 'Completed' && (
                  <form action={ubahStatusIzin}>
                    <input type="hidden" name="id" value={String(z.id)} />
                    <input type="hidden" name="aksi" value="kembali" />
                    <button type="submit" className="btn-sekunder">Tandai sudah kembali</button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
