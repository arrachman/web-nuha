import { prisma } from '@/lib/prisma';

export type BarisLaporan = {
  unit: string;
  siswa: number;
  hadir: string;
  capaian: string;
  keuangan: number;
};

/**
 * Rekap lintas modul per unit: populasi santri, kehadiran, capaian akademik,
 * dan nilai keuangan yang tertagih. Dihitung di JS karena Presensi/Nilai/
 * Payment tidak menyimpan unitId langsung — hanya via relasi ke santri.
 */
export async function ambilRekapLaporan(): Promise<BarisLaporan[]> {
  const [units, santri, presensi, nilai, invoices] = await Promise.all([
    prisma.unit.findMany({ orderBy: { nama: 'asc' } }),
    prisma.santri.findMany({ select: { id: true, unitId: true } }),
    prisma.attendance.findMany({ select: { studentId: true, status: true } }),
    prisma.nilai.findMany({ select: { santriId: true, akhir: true } }),
    prisma.invoice.findMany({ select: { santriId: true, paidAmount: true } }),
  ]);

  const unitSantri = new Map<number, bigint[]>();
  for (const s of santri) {
    if (s.unitId === null) continue;
    const list = unitSantri.get(s.unitId) ?? [];
    list.push(s.id);
    unitSantri.set(s.unitId, list);
  }

  return units.map((unit) => {
    const idSantri = new Set((unitSantri.get(unit.id) ?? []).map(String));
    const presensiUnit = presensi.filter((p) => idSantri.has(String(p.studentId)));
    const nilaiUnit = nilai.filter((n) => idSantri.has(String(n.santriId)));
    const tagihanUnit = invoices.filter((t) => idSantri.has(String(t.santriId)));

    const hadirPct = presensiUnit.length
      ? Math.round((presensiUnit.filter((p) => p.status === 'Present').length / presensiUnit.length) * 100)
      : null;
    const rataNilai = nilaiUnit.length
      ? nilaiUnit.reduce((total, n) => total + Number(n.akhir), 0) / nilaiUnit.length
      : null;
    const keuangan = tagihanUnit.reduce((total, t) => total + Number(t.paidAmount), 0);

    return {
      unit: unit.nama,
      siswa: idSantri.size,
      hadir: hadirPct === null ? 'Belum ada data' : `${hadirPct}% hadir`,
      capaian: rataNilai === null ? 'Belum ada nilai' : `Rata-rata nilai akhir ${rataNilai.toFixed(1)}`,
      keuangan,
    };
  });
}
