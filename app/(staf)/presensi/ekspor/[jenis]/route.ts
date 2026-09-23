import { readSession, isSuperAdmin } from '@/lib/auth';
import { can } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { csvResponse } from '@/lib/csv';
import { recordAudit } from '@/lib/audit';
import { rombelBolehInput } from '@/lib/presensi/akses';
import { tanggalDb, tanggalWib } from '@/lib/presensi/inti';

/** Ekspor rekap presensi bulanan (02 §4.5). Butuh presensi.export; guru dibatasi rombelnya sendiri. */
export async function GET(req: Request, { params }: { params: Promise<{ jenis: string }> }) {
  const session = await readSession();
  if (!session) return new Response('Perlu masuk.', { status: 401 });
  if (!(await can(session, 'presensi.export'))) return new Response('Tidak berwenang.', { status: 403 });
  const { jenis } = await params;
  const bulanRaw = new URL(req.url).searchParams.get('bulan') ?? '';
  const bulan = /^\d{4}-\d{2}$/.test(bulanRaw) ? bulanRaw : tanggalWib().slice(0, 7);
  const [th, bl] = bulan.split('-').map(Number);
  const dari = tanggalDb(`${bulan}-01`);
  const sampai = new Date(Date.UTC(th, bl, 0));
  const pengelola = isSuperAdmin(session) || session.peran.some((p) => ['ketua', 'kepsmp', 'kepma', 'pengasuh', 'sdm'].includes(p));
  const unitIds = !isSuperAdmin(session) && session.unitIds ? session.unitIds : null;
  await recordAudit({ aksi: 'PRESENSI_EKSPOR', entitas: 'attendance_records', entitasId: `${jenis}:${bulan}`, ringkasan: `Ekspor ${jenis} ${bulan}.`, aktor: { id: session.userId, nama: session.nama } });

  if (jenis === 'rekap-santri') {
    let whereSantri: Record<string, unknown> = unitIds ? { unitId: { in: unitIds } } : {};
    if (!pengelola) {
      const rombel = await rombelBolehInput(session, tanggalWib(), null);
      whereSantri = { kelasId: { in: rombel.map((k) => k.id).concat(-1) } };
    }
    const rows = await prisma.attendance.groupBy({ by: ['studentId', 'status'], where: { date: { gte: dari, lte: sampai }, student: whereSantri }, _count: { _all: true } });
    const santri = await prisma.santri.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.studentId))] } }, include: { person: true, kelas: true, unit: true }, orderBy: [{ unitId: 'asc' }, { kelasId: 'asc' }] });
    return csvResponse(`rekap-presensi-santri-${bulan}.csv`, ['Unit', 'Rombel', 'NIS', 'Nama', 'Hadir', 'Terlambat', 'Sakit', 'Izin', 'Alpa', '% hadir'],
      santri.map((s) => {
        const n = (st: string) => rows.find((r) => r.studentId === s.id && r.status === st)?._count._all ?? 0;
        const total = ['Present', 'Late', 'Sick', 'Excused', 'Absent'].reduce((a, st) => a + n(st), 0);
        return [s.unit?.nama ?? '', s.kelas?.nama ?? '', s.nis ?? '', s.person.fullName, n('Present'), n('Late'), n('Sick'), n('Excused'), n('Absent'), total ? Math.round(((n('Present') + n('Late')) / total) * 100) : ''];
      }));
  }
  if (jenis === 'rekap-pegawai') {
    if (!pengelola) return new Response('Rekap pegawai hanya untuk kepala unit, SDM, dan ketua.', { status: 403 });
    const whereStaf = unitIds ? { OR: [{ unitId: { in: unitIds } }, { otherUnits: { some: { unitId: { in: unitIds } } } }] } : {};
    const rows = await prisma.staffAttendance.findMany({ where: { date: { gte: dari, lte: sampai }, staff: whereStaf }, select: { staffId: true, status: true, lateMinutes: true, earlyDeparture: true, outsideGeofence: true } });
    const staf = await prisma.staff.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.staffId))] } }, include: { person: true, unit: true }, orderBy: { unitId: 'asc' } });
    return csvResponse(`rekap-presensi-pegawai-${bulan}.csv`, ['Unit', 'NIP', 'Nama', 'Hadir tepat', 'Terlambat (kali)', 'Terlambat (menit)', 'Pulang cepat', 'Izin/Sakit', 'Alpa', 'Luar lokasi'],
      staf.map((s) => {
        const r = rows.filter((x) => x.staffId === s.id);
        return [s.unit?.nama ?? '', s.employeeNumber, s.person.fullName, r.filter((x) => x.status === 'Present').length, r.filter((x) => x.status === 'Late').length,
          r.reduce((a, x) => a + (x.lateMinutes ?? 0), 0), r.filter((x) => x.earlyDeparture).length, r.filter((x) => x.status === 'Sick' || x.status === 'Excused').length,
          r.filter((x) => x.status === 'Absent').length, r.filter((x) => x.outsideGeofence).length];
      }));
  }
  return new Response('Jenis ekspor tidak dikenal.', { status: 404 });
}
