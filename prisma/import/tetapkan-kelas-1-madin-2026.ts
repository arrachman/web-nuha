import { StatusSantri } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';

const AKTOR_SKRIP = { nama: 'Penetapan Kelas 1 Madin 2026/2027 (skrip)' };
const NIS_KELAS_1 = [
  '2025PONDOK031', '0117090853', '0115550163', '2025PONDOK026', '2025PONDOK027',
  '0116796140', '3100254419', '2025PONDOK030', '2026MA003', '2026MA010',
  '3110556472', '0128881462', '0121139088', '0125986157', '2026MA011',
  '2025PONDOK039', '3119359886', '2026MA012', '131235730007250125', '2025PONDOK043',
  '3112699830', '0115654242', '2025PONDOK046', '2026MA014', '2025PONDOK048',
  '2025PONDOK049', '2026MA005', '2026MA006', '2025PONDOK052', '0113800080',
  '131235730007250128', '2025PONDOK055', '2025PONDOK056', '2025PONDOK057', '2025PONDOK058',
  '0125012565', '3124143656', '2025PONDOK061', '2026MA020', '2026MA021',
  '2026MA022', '3129615296', '2026MA023', '2025PONDOK067', '2025PONDOK068',
  '0113382601', '2025PONDOK070', '2025PONDOK071', '2026MA008', '0124244508',
] as const;
const NIS_PULIHKAN_KELAS_2 = ['2026MA013', '2026MA015', '2026MA017', '2026MA018'] as const;

async function main() {
  const [unit, academicYear] = await Promise.all([
    prisma.unit.findUniqueOrThrow({ where: { key: 'Pondok' } }),
    prisma.academicYear.findFirstOrThrow({ where: { isActive: true } }),
  ]);
  const [kelas1, kelas2] = await Promise.all([
    prisma.kelas.findUniqueOrThrow({ where: { unitId_nama_academicYearId: { unitId: unit.id, nama: 'Kelas 1', academicYearId: academicYear.id } } }),
    prisma.kelas.findUniqueOrThrow({ where: { unitId_nama_academicYearId: { unitId: unit.id, nama: 'Kelas 2', academicYearId: academicYear.id } } }),
  ]);
  const semuaNis = [...NIS_KELAS_1, ...NIS_PULIHKAN_KELAS_2];
  const santri = await prisma.santri.findMany({
    where: { nis: { in: semuaNis } },
    include: { person: { select: { fullName: true } } },
  });
  const santriByNis = new Map(santri.map((item) => [item.nis, item]));
  const hilang = semuaNis.filter((nis) => !santriByNis.has(nis));
  if (hilang.length) throw new Error(`NIS tidak ditemukan: ${hilang.join(', ')}`);

  await prisma.$transaction(async (tx) => {
    const targetKelas1 = NIS_KELAS_1.map((nis) => santriByNis.get(nis)!);
    const anggotaLama = await tx.santriKelas.findMany({
      where: { kelasId: kelas1.id },
      select: { santriId: true, santri: { select: { nis: true, person: { select: { fullName: true } } } } },
    });
    const targetIds = new Set(targetKelas1.map((item) => item.id));

    for (const anggota of anggotaLama.filter((item) => !targetIds.has(item.santriId))) {
      await tx.santriKelas.delete({ where: { santriId_kelasId: { santriId: anggota.santriId, kelasId: kelas1.id } } });
      await recordAudit({
        aksi: 'delete', entitas: 'SantriKelas', entitasId: `${anggota.santriId}:${kelas1.id}`,
        ringkasan: `Lepas "${anggota.santri.person.fullName}" dari Madin Kelas 1 ${academicYear.code}`,
        perubahan: { dari: { kelasId: kelas1.id, nis: anggota.santri.nis } }, aktor: AKTOR_SKRIP,
      });
    }

    for (const item of targetKelas1) {
      await tx.santriKelas.upsert({
        where: { santriId_kelasId: { santriId: item.id, kelasId: kelas1.id } },
        update: {},
        create: { santriId: item.id, kelasId: kelas1.id, unitId: unit.id, utama: item.unitId === unit.id && item.kelasId === kelas1.id },
      });
    }

    for (const nis of ['2026MA010', '2026MA011', '2026MA012', '2026MA014', '2026MA020', '2026MA021', '2026MA022', '2026MA023']) {
      const item = santriByNis.get(nis)!;
      await tx.santri.update({ where: { id: item.id }, data: { status: StatusSantri.Aktif, unitId: unit.id, kelasId: kelas1.id, tahunMasuk: '2026' } });
      await tx.santriKelas.upsert({
        where: { santriId_kelasId: { santriId: item.id, kelasId: kelas1.id } },
        update: { utama: true },
        create: { santriId: item.id, kelasId: kelas1.id, unitId: unit.id, utama: true },
      });
      await tx.riwayatPendidikan.upsert({
        where: { personId_unitId_academicYearId: { personId: item.personId, unitId: unit.id, academicYearId: academicYear.id } },
        update: { kelasNama: kelas1.nama, tingkat: kelas1.tingkat, status: StatusSantri.Aktif },
        create: { personId: item.personId, unitId: unit.id, kelasNama: kelas1.nama, tingkat: kelas1.tingkat, academicYearId: academicYear.id, status: StatusSantri.Aktif },
      });
      await recordAudit({
        aksi: 'update', entitas: 'Santri', entitasId: String(item.id),
        ringkasan: `Pulihkan "${item.person.fullName}" sebagai santri Mukim Madin Kelas 1 ${academicYear.code}`,
        perubahan: { dari: { status: item.status, unitId: item.unitId, kelasId: item.kelasId }, ke: { status: StatusSantri.Aktif, unitId: unit.id, kelasId: kelas1.id } }, aktor: AKTOR_SKRIP,
      });
    }

    for (const nis of NIS_PULIHKAN_KELAS_2) {
      const item = santriByNis.get(nis)!;
      await tx.santri.update({ where: { id: item.id }, data: { status: StatusSantri.Aktif, unitId: unit.id, kelasId: kelas2.id, tahunMasuk: '2026' } });
      await tx.santriKelas.upsert({
        where: { santriId_kelasId: { santriId: item.id, kelasId: kelas2.id } },
        update: { utama: true },
        create: { santriId: item.id, kelasId: kelas2.id, unitId: unit.id, utama: true },
      });
      await tx.riwayatPendidikan.upsert({
        where: { personId_unitId_academicYearId: { personId: item.personId, unitId: unit.id, academicYearId: academicYear.id } },
        update: { kelasNama: kelas2.nama, tingkat: kelas2.tingkat, status: StatusSantri.Aktif },
        create: { personId: item.personId, unitId: unit.id, kelasNama: kelas2.nama, tingkat: kelas2.tingkat, academicYearId: academicYear.id, status: StatusSantri.Aktif },
      });
      await recordAudit({
        aksi: 'update', entitas: 'Santri', entitasId: String(item.id),
        ringkasan: `Pulihkan "${item.person.fullName}" sebagai santri Mukim Madin Kelas 2 ${academicYear.code}`,
        perubahan: { dari: { status: item.status, unitId: item.unitId, kelasId: item.kelasId }, ke: { status: StatusSantri.Aktif, unitId: unit.id, kelasId: kelas2.id } }, aktor: AKTOR_SKRIP,
      });
    }
  });

  const [totalKelas1, totalKelas2] = await Promise.all([
    prisma.santriKelas.count({ where: { kelasId: kelas1.id } }),
    prisma.santriKelas.count({ where: { kelasId: kelas2.id } }),
  ]);
  if (totalKelas1 !== NIS_KELAS_1.length) throw new Error(`Verifikasi Kelas 1 gagal: ${totalKelas1} anggota, seharusnya ${NIS_KELAS_1.length}`);
  console.log(`OK — Madin Kelas 1: ${totalKelas1} anggota; Kelas 2: ${totalKelas2} anggota.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
