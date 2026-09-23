/**
 * Data demo Presensi (02): titik koordinat unit, akun guru yang ditautkan ke
 * data pegawai, rombel SMP 7A & MA 10A dengan santri, dan asrama yang
 * dipegang musyrif.1. Idempoten; dipanggil dari prisma/seed.ts dan bisa
 * dijalankan sendiri: `npx tsx prisma/seed-presensi.ts`. Nilai deterministik.
 */
import { JenisKelamin, PrismaClient } from '@prisma/client';

// Kompleks PPSS Nurul Huda Mergosono, Malang — satu kompleks (06 P5), titik per unit berdekatan.
const KOORDINAT: Record<string, [number, number]> = {
  YAYASAN: [-7.9946, 112.6392], Pondok: [-7.9947, 112.6391], SMP: [-7.9944, 112.6395], MA: [-7.9950, 112.6388], Poskestren: [-7.9948, 112.6390],
};

const NAMA_SANTRI = [
  'Ahmad Fauzi', 'Muhammad Rizky', 'Ilham Maulana', 'Fajar Nugroho', 'Hafidz Ramadhan', 'Nabil Akbar', 'Rafi Pratama', 'Yusuf Hidayat',
  'Zaki Alfarizi', 'Arif Setiawan', 'Dimas Saputra', 'Farhan Hakim', 'Iqbal Firdaus', 'Luthfi Hamdani', 'Naufal Aziz', 'Rizal Mubarok',
];

export async function seedPresensiDemo(prisma: PrismaClient) {
  const units = new Map((await prisma.unit.findMany()).map((u) => [u.key, u]));
  for (const [key, [lat, lng]] of Object.entries(KOORDINAT)) {
    const u = units.get(key);
    if (u && u.latitude == null) await prisma.unit.update({ where: { id: u.id }, data: { latitude: lat, longitude: lng } });
  }

  // Akun guru.1..3 ditautkan ke data pegawai (selfie butuh baris Staff).
  const penempatan = [['guru.1', 'SMP'], ['guru.2', 'MA'], ['guru.3', 'SMP']] as const;
  const stafGuru = new Map<string, bigint>();
  for (const [i, [username, unitKey]] of penempatan.entries()) {
    const user = await prisma.user.findUnique({ where: { username } });
    const unit = units.get(unitKey);
    if (!user || !unit) continue;
    const staff = await prisma.staff.upsert({
      where: { personId: user.personId },
      create: { personId: user.personId, employeeNumber: `GURU-DEMO-${i + 1}`, unitId: unit.id, position: 'Guru', status: 'Aktif' },
      update: {},
    });
    await prisma.staffUnit.upsert({ where: { staffId_unitId: { staffId: staff.id, unitId: unit.id } }, create: { staffId: staff.id, unitId: unit.id, isPrimary: true }, update: {} });
    stafGuru.set(username, staff.id);
  }

  const ta = await prisma.academicYear.findFirst({ where: { isActive: true } });
  const rombel: Array<{ unit: string; nama: string; tingkat: string; wali: string }> = [
    { unit: 'SMP', nama: '7A', tingkat: '7', wali: 'guru.1' },
    { unit: 'MA', nama: '10A', tingkat: '10', wali: 'guru.2' },
  ];
  const kelasId = new Map<string, number>();
  for (const r of rombel) {
    const unit = units.get(r.unit)!;
    const ada = await prisma.kelas.findFirst({ where: { unitId: unit.id, nama: r.nama, academicYearId: ta?.id ?? null } });
    const k = ada ?? await prisma.kelas.create({ data: { unitId: unit.id, nama: r.nama, tingkat: r.tingkat, academicYearId: ta?.id ?? null } });
    await prisma.kelas.update({ where: { id: k.id }, data: { homeroomStaffId: stafGuru.get(r.wali) ?? null } });
    kelasId.set(r.nama, k.id);
  }

  const musyrif = await prisma.staff.findFirst({ where: { person: { user: { username: 'musyrif.1' } } } });
  const asrama = await prisma.dormitory.upsert({
    where: { name: 'Asrama Putra Al-Fatih' },
    create: { name: 'Asrama Putra Al-Fatih', gender: JenisKelamin.L, capacity: 48, supervisor: 'Ust. Faiz Abdullah', supervisorStaffId: musyrif?.id ?? null },
    update: { supervisorStaffId: musyrif?.id ?? null },
  });
  const kamar = [];
  for (const code of ['F-01', 'F-02']) {
    const ada = await prisma.room.findFirst({ where: { dormitoryId: asrama.id, code } });
    kamar.push(ada ?? await prisma.room.create({ data: { dormitoryId: asrama.id, code, capacity: 12 } }));
  }

  for (const [i, nama] of NAMA_SANTRI.entries()) {
    const smp = i < 8;
    const nis = `${smp ? 'SMP' : 'MA'}26${String(i + 1).padStart(3, '0')}`;
    const email = `santri.demo.${nis.toLowerCase()}@nuha.local`;
    const person = await prisma.person.upsert({ where: { email }, create: { fullName: nama, gender: JenisKelamin.L, email, isActive: true }, update: {} });
    const unit = units.get(smp ? 'SMP' : 'MA')!;
    const kId = kelasId.get(smp ? '7A' : '10A')!;
    const s = await prisma.santri.upsert({
      where: { personId: person.id },
      create: { personId: person.id, nis, unitId: unit.id, kelasId: kId, roomId: kamar[i % 2].id, status: 'Aktif', tahunMasuk: '2026' },
      update: { kelasId: kId, roomId: kamar[i % 2].id },
    });
    await prisma.santriKelas.upsert({ where: { santriId_kelasId: { santriId: s.id, kelasId: kId } }, create: { santriId: s.id, kelasId: kId, unitId: unit.id, utama: true }, update: {} });
  }
}

if (process.argv[1]?.endsWith('seed-presensi.ts')) {
  const prisma = new PrismaClient();
  seedPresensiDemo(prisma)
    .then(() => console.log('Seed presensi demo selesai.'))
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}
