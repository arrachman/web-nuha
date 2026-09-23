import { prisma } from '@/lib/prisma';
import { isSuperAdmin, type SessionPayload } from '@/lib/auth';
import { LABEL_STATUS } from '@/lib/presensi/inti';
import { FormKeputusan, Kosong } from '@/components';
import { putuskanIzinPegawai, tinjauPresensi } from './actions';

const K = '/presensi?tab=tinjau';
const jam = (d: Date | null) => (d ? new Date(d.getTime() + 7 * 3600_000).toISOString().slice(11, 16) : '-');

/** Filter pegawai dalam cakupan unit peninjau (kepala unit: pegawai unitnya; sdm/ketua tanpa UserUnit: semua). */
function whereStafTerlihat(session: SessionPayload) {
  if (isSuperAdmin(session) || session.unitIds == null) return {};
  const ids = session.unitIds.length ? session.unitIds : [-1];
  return { OR: [{ unitId: { in: ids } }, { otherUnits: { some: { unitId: { in: ids } } } }] };
}

/**
 * Antrean "Perlu ditinjau" (02 §3.7): luar lokasi, lokasi tidak akurat, presensi
 * manual — foto selfie berdampingan dengan foto profil. Plus pengajuan izin pegawai.
 */
export async function TabTinjau({ session }: { session: SessionPayload }) {
  const staf = whereStafTerlihat(session);
  const [antrean, izin] = await Promise.all([
    prisma.staffAttendance.findMany({
      where: { reviewStatus: null, OR: [{ outsideGeofence: true }, { inaccurateLocation: true }, { source: 'MANUAL', checkInAt: { not: null } }], staff: staf },
      include: { staff: { include: { person: true, unit: true } } }, orderBy: { date: 'desc' }, take: 50,
    }),
    prisma.staffLeave.findMany({ where: { status: 'Diajukan' }, orderBy: { createdAt: 'asc' } }),
  ]);
  const stafIzin = await prisma.staff.findMany({ where: { id: { in: izin.map((z) => z.staffId) }, ...staf }, include: { person: true } });
  const stafIzinById = new Map(stafIzin.map((s) => [String(s.id), s]));
  const izinTerlihat = izin.filter((z) => stafIzinById.has(String(z.staffId)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <h3 className="card-judul">Presensi perlu ditinjau <span className="badge badge-oranye" data-testid="jumlah-tinjau">{antrean.length}</span></h3>
        {antrean.length === 0 ? <Kosong pesan="Tidak ada presensi yang perlu ditinjau." /> : antrean.map((r) => (
          <div key={String(r.id)} data-testid={`tinjau-${r.staff.person.fullName}`} style={{ display: 'flex', gap: 14, flexWrap: 'wrap', border: '1px solid var(--garis)', borderRadius: 12, padding: 12, marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {r.checkInPhotoId ? <a href={`/berkas/${r.checkInPhotoId}`} target="_blank" rel="noreferrer"><img src={`/berkas/${r.checkInPhotoId}`} alt={`Selfie ${r.staff.person.fullName}`} style={{ width: 96, height: 128, objectFit: 'cover', borderRadius: 8 }} /></a> : <div className="muted" style={{ width: 96, fontSize: 12 }}>tanpa foto</div>}
              {r.staff.person.photoUrl ? <img src={r.staff.person.photoUrl} alt="Foto profil" style={{ width: 96, height: 128, objectFit: 'cover', borderRadius: 8, opacity: 0.9 }} /> : <div className="muted" style={{ width: 96, height: 128, display: 'grid', placeItems: 'center', fontSize: 11, border: '1px dashed var(--garis)', borderRadius: 8 }}>belum ada foto profil</div>}
            </div>
            <div style={{ flex: 1, minWidth: 220, fontSize: 13 }}>
              <div style={{ fontWeight: 700 }}>{r.staff.person.fullName} <span className="muted" style={{ fontWeight: 400 }}>· {r.staff.unit?.nama ?? '-'}</span></div>
              <div>{r.date.toLocaleDateString('id-ID', { timeZone: 'UTC' })} · masuk {jam(r.checkInAt)} · pulang {jam(r.checkOutAt)} · {LABEL_STATUS[r.status]}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '6px 0' }}>
                {r.outsideGeofence && <span className="badge badge-oranye">Luar lokasi ±{r.checkInDistanceM ?? '?'} m</span>}
                {r.inaccurateLocation && <span className="badge badge-kuning">GPS tidak akurat ±{r.checkInAccuracyM ?? '?'} m</span>}
                {r.source === 'MANUAL' && <span className="badge badge-netral">Input manual</span>}
              </div>
              {r.outsideReason && <div className="muted">Alasan: {r.outsideReason}</div>}
              {r.checkInLat && <a href={`https://www.openstreetmap.org/?mlat=${r.checkInLat}&mlon=${r.checkInLng}#map=18/${r.checkInLat}/${r.checkInLng}`} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>Lihat titik di peta</a>}
              <FormKeputusan action={tinjauPresensi} id={String(r.id)} kembali={K} labelSetuju="Terima" />
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="card-judul">Pengajuan izin pegawai</h3>
        {izinTerlihat.length === 0 ? <Kosong pesan="Tidak ada pengajuan izin yang menunggu." /> : izinTerlihat.map((z) => (
          <div key={String(z.id)} data-testid={`izin-${z.id}`} style={{ borderBottom: '1px solid #F0EDE4', padding: '10px 0', fontSize: 13 }}>
            <b>{stafIzinById.get(String(z.staffId))?.person.fullName}</b> — {z.jenis} {z.dari.toISOString().slice(0, 10)}{z.sampai > z.dari ? ` s.d. ${z.sampai.toISOString().slice(0, 10)}` : ''}: {z.alasan}
            {z.lampiranId && <> · <a href={`/berkas/${z.lampiranId}`} target="_blank" rel="noreferrer">lampiran</a></>}
            <FormKeputusan action={putuskanIzinPegawai} id={String(z.id)} kembali={K} />
          </div>
        ))}
      </div>
    </div>
  );
}
