import { prisma } from '@/lib/prisma';
import { readSession } from '@/lib/auth';
import { getUnitAktif } from '@/lib/unit-scope';
import Link from 'next/link';
import { Avatar, Kosong } from '@/components';
import { simpanAbsenJamaah } from './actions';

const WAKTU_LIST = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'];
const OPSI_STATUS: Array<{ kode: string; label: string; status: 'Present' | 'Sick' | 'Excused' | 'Absent' }> = [
  { kode: 'H', label: 'Hadir', status: 'Present' },
  { kode: 'S', label: 'Sakit', status: 'Sick' },
  { kode: 'I', label: 'Izin', status: 'Excused' },
  { kode: 'A', label: 'Alpa', status: 'Absent' },
];

/** Absensi jamaah per sesi — sesi dipilih lewat query param, bukan state klien. */
export async function TabJamaah({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const session = await readSession();
  const unitAktif = session ? await getUnitAktif(session) : null;
  const fStudent = unitAktif != null ? { student: { unitId: unitAktif } } : {};
  const rawWaktu = Array.isArray(searchParams.waktu) ? searchParams.waktu[0] : searchParams.waktu;
  const waktu = WAKTU_LIST.includes(rawWaktu ?? '') ? (rawWaktu as string) : 'Subuh';

  const hariIni = new Date();
  hariIni.setHours(0, 0, 0, 0);
  const today = hariIni.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const [santri, presensiHariIni, rekapPekan] = await Promise.all([
    prisma.santri.findMany({
      where: { status: 'Aktif', ...(unitAktif != null ? { unitId: unitAktif } : {}) },
      include: { person: true, room: { include: { dormitory: true } } },
      orderBy: { person: { fullName: 'asc' } },
    }),
    prisma.attendance.findMany({ where: { date: hariIni, session: waktu, ...fStudent } }),
    prisma.attendance.groupBy({
      by: ['session', 'status'],
      where: { date: { gte: new Date(hariIni.getTime() - 6 * 86400000) }, ...fStudent },
      _count: { _all: true },
    }),
  ]);

  const statusHariIni = new Map(presensiHariIni.map((p) => [String(p.studentId), p.status]));

  const rekapPerSesi = WAKTU_LIST.map((w) => {
    const hadir = rekapPekan.filter((r) => r.session === w && r.status === 'Present').reduce((t, r) => t + r._count._all, 0);
    return { sesi: w, hadir };
  });
  const maxHadir = Math.max(...rekapPerSesi.map((r) => r.hadir), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <div className="card-judul" style={{ marginBottom: 2 }}>Absensi jamaah {waktu} — {today}</div>
            <div className="muted">Tandai status hadir tiap santri lalu simpan.</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 16 }}>
          {WAKTU_LIST.map((w) => (
            <Link
              key={w}
              href={`/kepesantrenan?tab=jamaah&waktu=${w}`}
              className={`tab ${w === waktu ? 'active' : ''}`}
              style={{ border: '1px solid var(--garis)', borderRadius: 999 }}
            >
              {w}
            </Link>
          ))}
        </div>
        {santri.length === 0 ? (
          <Kosong pesan="Tidak ada santri aktif." />
        ) : (
          <form action={simpanAbsenJamaah}>
            <input type="hidden" name="sesi" value={waktu} />
            <div className="grid g2">
              {santri.map((x) => {
                const nilaiSekarang = statusHariIni.get(String(x.id)) ?? 'Present';
                return (
                  <div key={String(x.id)} className="inset" style={{ display: 'flex', gap: 11, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Avatar nama={x.person.fullName} size={32} />
                    <div style={{ flex: 1, minWidth: 130 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{x.person.fullName}</div>
                      <div className="muted" style={{ fontSize: 11.5 }}>
                        {x.room?.dormitory.name ?? '—'} · kamar {x.room?.code ?? '—'}
                      </div>
                    </div>
                    <select name={`status-${x.id}`} defaultValue={nilaiSekarang} className="field" style={{ margin: 0 }}>
                      {OPSI_STATUS.map((o) => (
                        <option key={o.kode} value={o.status}>{o.kode} — {o.label}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
            <button type="submit" className="btn" style={{ marginTop: 16 }}>Simpan absensi</button>
          </form>
        )}
      </div>
      <div className="card">
        <div className="card-judul">Rekap kehadiran jamaah 7 hari terakhir</div>
        <div style={{ display: 'flex', gap: 22, alignItems: 'flex-end', height: 160, padding: '0 8px' }}>
          {rekapPerSesi.map((r) => (
            <div key={r.sesi} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>{r.hadir}</div>
              <div
                style={{
                  width: '100%', maxWidth: 52, height: `${(r.hadir / maxHadir) * 120}px`,
                  background: 'var(--hijau)', borderRadius: '7px 7px 0 0',
                }}
              />
              <div className="muted" style={{ fontSize: 12 }}>{r.sesi}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
