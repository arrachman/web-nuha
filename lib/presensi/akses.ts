import { cache } from 'react';
import { can } from '@/lib/access';
import { isSuperAdmin, type SessionPayload } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { namaHariPelajaran, namaHariPiket } from '@/lib/penjadwal/waktu';
import { hariDariTanggal, tanggalDb } from './inti';

export const izinPresensi = cache(async (session: SessionPayload) => {
  const kunci = ['self', 'view', 'input', 'lock', 'override', 'review', 'export', 'setting'] as const;
  const hasil = await Promise.all(kunci.map((k) => can(session, `presensi.${k}`)));
  return Object.fromEntries(kunci.map((k, i) => [k, hasil[i]])) as Record<(typeof kunci)[number], boolean>;
});
export type IzinPresensi = Awaited<ReturnType<typeof izinPresensi>>;

/** Staff milik sesi (akun ↔ Person ↔ Staff). null bila akun bukan pegawai. */
export const stafSaya = cache(async (session: SessionPayload) =>
  prisma.staff.findFirst({ where: { person: { user: { id: BigInt(session.userId) } } }, include: { person: true, otherUnits: true } }),
);

/** Kepala unit / ketua / superadmin: boleh seluruh rombel/asrama dalam cakupan unit. */
function pengelolaUnit(session: SessionPayload): boolean {
  return isSuperAdmin(session) || session.peran.some((p) => ['ketua', 'kepsmp', 'kepma', 'pengasuh'].includes(p));
}

/**
 * Rombel yang boleh diisi presensinya pada `tanggal` (02 §2.2): wali kelas
 * (`Kelas.homeroomStaffId`), guru yang mengajar rombel itu hari itu
 * (`JadwalPelajaran.staffId`, bukan pencocokan nama), guru piket hari itu
 * (semua rombel di unitnya), atau kepala unit (semua dalam cakupan).
 */
export async function rombelBolehInput(session: SessionPayload, tanggal: string, unitIdSesi: number | null) {
  const whereUnitSesi = unitIdSesi ? { unitId: unitIdSesi } : {};
  const scope = !isSuperAdmin(session) && session.unitIds ? { unitId: { in: session.unitIds.length ? session.unitIds : [-1] } } : {};
  const ta = await prisma.academicYear.findFirst({ where: { isActive: true } });
  const dasar = { ...whereUnitSesi, ...(ta ? { OR: [{ academicYearId: ta.id }, { academicYearId: null }] } : {}) };
  if (pengelolaUnit(session)) {
    return prisma.kelas.findMany({ where: { ...dasar, ...scope }, include: { unit: true }, orderBy: [{ unitId: 'asc' }, { nama: 'asc' }] });
  }
  const staff = await stafSaya(session);
  if (!staff) return [];
  const hari = hariDariTanggal(tanggal);
  const idxHari = hari === 7 ? 0 : hari;
  const [ajar, piket] = await Promise.all([
    prisma.jadwalPelajaran.findMany({ where: { staffId: staff.id, hari: namaHariPelajaran(idxHari) }, select: { kelas: true, unitId: true } }),
    prisma.jadwalPiket.count({ where: { staffId: staff.id, hari: namaHariPiket(idxHari) } }),
  ]);
  const unitSaya = [staff.unitId, ...staff.otherUnits.map((u) => u.unitId)].filter((x): x is number => x != null);
  const namaAjar = ajar.map((a) => a.kelas).filter((x): x is string => !!x);
  return prisma.kelas.findMany({
    where: {
      ...dasar,
      AND: [{
        OR: [
          { homeroomStaffId: staff.id },
          ...(namaAjar.length ? [{ nama: { in: namaAjar }, unitId: { in: ajar.map((a) => a.unitId).filter((x): x is number => x != null) } }] : []),
          ...(piket > 0 && unitSaya.length ? [{ unitId: { in: unitSaya } }] : []),
        ],
      }],
    },
    include: { unit: true },
    orderBy: [{ unitId: 'asc' }, { nama: 'asc' }],
  });
}

/** Asrama yang boleh diisi (sesi pondok): musyrif → asrama yang ia pegang; pengasuh/ketua → semua. */
export async function asramaBolehInput(session: SessionPayload) {
  if (pengelolaUnit(session)) return prisma.dormitory.findMany({ orderBy: { name: 'asc' } });
  const staff = await stafSaya(session);
  if (!staff) return [];
  return prisma.dormitory.findMany({ where: { supervisorStaffId: staff.id }, orderBy: { name: 'asc' } });
}

/** Santri aktif sebuah rombel (kelas utama atau rombel tambahan lewat SantriKelas). */
export function santriRombel(kelasId: number) {
  return prisma.santri.findMany({
    where: { status: 'Aktif', OR: [{ kelasId }, { kelasLain: { some: { kelasId } } }] },
    include: { person: { select: { fullName: true } } }, orderBy: { person: { fullName: 'asc' } },
  });
}

export function santriAsrama(dormitoryId: number) {
  return prisma.santri.findMany({
    where: { status: 'Aktif', room: { dormitoryId } },
    include: { person: { select: { fullName: true } }, room: true }, orderBy: [{ roomId: 'asc' }, { person: { fullName: 'asc' } }],
  });
}

/**
 * Status otomatis (02 §2.3): izin pondok Approved yang mencakup tanggal → Izin
 * (sumber IZIN); rekam medis hari itu dengan tindak lanjut Istirahat/Rawat/Rujuk
 * → Sakit (sumber POSKESTREN). Poskestren menang atas izin bila keduanya ada.
 */
export async function statusOtomatis(santriIds: bigint[], tanggal: string) {
  const hasil = new Map<string, { status: 'Sick' | 'Excused'; source: 'IZIN' | 'POSKESTREN'; ket: string }>();
  if (!santriIds.length) return hasil;
  const awal = tanggalDb(tanggal);
  const akhir = new Date(awal.getTime() + 24 * 3600 * 1000 - 1);
  const [izin, medis] = await Promise.all([
    prisma.leavePermit.findMany({
      where: { studentId: { in: santriIds }, status: { in: ['Approved', 'Completed'] }, departedAt: { lte: akhir } },
    }),
    prisma.medicalRecord.findMany({ where: { studentId: { in: santriIds }, date: awal, followUpStatus: { in: ['Istirahat', 'Rawat', 'Rujuk'] } } }),
  ]);
  for (const z of izin) {
    const selesai = z.returnedAt ?? z.expectedReturnAt;
    if (selesai && selesai < awal) continue;
    if (!selesai && z.status === 'Completed') continue;
    hasil.set(String(z.studentId), { status: 'Excused', source: 'IZIN', ket: `Izin ${z.type} (${z.code})` });
  }
  for (const m of medis) hasil.set(String(m.studentId), { status: 'Sick', source: 'POSKESTREN', ket: `Poskestren: ${m.complaint}` });
  return hasil;
}

/** Titik geofence unit tempat pegawai terdaftar (Staff.unitId + StaffUnit). */
export async function titikUnitPegawai(staff: { unitId: number | null; otherUnits: Array<{ unitId: number }> }) {
  const ids = [...new Set([staff.unitId, ...staff.otherUnits.map((s) => s.unitId)].filter((x): x is number => x != null))];
  const units = await prisma.unit.findMany({ where: { id: { in: ids }, latitude: { not: null }, longitude: { not: null } } });
  return units.map((u) => ({ unitId: u.id, lat: Number(u.latitude), lng: Number(u.longitude), radiusM: u.radiusPresensiM, nama: u.nama }));
}

/** Jadwal kerja berlaku: pengecualian per pegawai dulu, lalu jadwal unit. null = tidak ada jam kerja hari itu. */
export async function jadwalKerja(staffId: bigint, unitId: number | null, hari: number) {
  const khusus = await prisma.workSchedule.findFirst({ where: { staffId, hari } });
  if (khusus) return khusus;
  if (!unitId) return null;
  return prisma.workSchedule.findFirst({ where: { unitId, staffId: null, hari } });
}
