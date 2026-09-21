/**
 * Gabungkan dua baris Pegawai milik Alfan Jamil.
 *
 * "Alfan Jamil, M.Si, Gr" (GTT-MA-005, unit MA — dari DATA GURU.xlsx) dan
 * "Alfan Jamil" (AST-004, unit Madin — dari daftar asatidz) adalah orang yang
 * sama. Sejak migrasi `pegawai_multi_unit`, satu pegawai bisa bertugas di lebih
 * dari satu unit, jadi duplikatnya tidak perlu lagi.
 *
 * Yang dipertahankan: Pegawai GTT-MA-005 (punya tempat/tanggal lahir dan
 * komponen gaji). Baris Madin dilebur jadi penugasan `pegawai_unit` kedua,
 * gelar/panggilan dari baris Madin ("Gus", "Gus Alfan") dipindah ke Orang yang
 * bertahan, lalu Pegawai + Orang duplikat dihapus.
 *
 * Idempoten: aman dijalankan ulang.
 *
 *   npx tsx prisma/import/gabung-alfan-jamil.ts
 */
import { PrismaClient } from '@prisma/client';

const NIP_SIMPAN = 'GTT-MA-005';
const NIP_HAPUS = 'AST-004';

const prisma = new PrismaClient();

async function main() {
  const simpan = await prisma.staff.findUnique({
    where: { employeeNumber: NIP_SIMPAN },
    include: { person: true },
  });
  if (!simpan) throw new Error(`pegawai ${NIP_SIMPAN} tidak ditemukan`);

  const hapus = await prisma.staff.findUnique({
    where: { employeeNumber: NIP_HAPUS },
    include: { person: true },
  });

  if (!hapus) {
    console.log(`${NIP_HAPUS} sudah tidak ada — penggabungan tampaknya sudah dijalankan.`);
  } else {
    if (hapus.person.fullName.replace(/,.*$/, '').trim() !== 'Alfan Jamil') {
      throw new Error(`${NIP_HAPUS} bukan Alfan Jamil melainkan "${hapus.person.fullName}" — batal`);
    }

    // Penugasan Madin menjadi baris pegawai_unit kedua pada pegawai yang bertahan.
    if (hapus.unitId !== null) {
      await prisma.staffUnit.upsert({
        where: { staffId_unitId: { staffId: simpan.id, unitId: hapus.unitId } },
        create: {
          staffId: simpan.id,
          unitId: hapus.unitId,
          position: hapus.position,
          employeeNumber: hapus.employeeNumber,
          isPrimary: false,
        },
        update: { position: hapus.position, employeeNumber: hapus.employeeNumber },
      });
    }

    // Gelar & panggilan hanya ada di baris Madin; nama resmi hanya di baris MA.
    await prisma.person.update({
      where: { id: simpan.personId },
      data: {
        fullName: 'Alfan Jamil',
        gelar: simpan.person.gelar ?? hapus.person.gelar,
        panggilan: simpan.person.panggilan ?? hapus.person.panggilan,
        namaLengkap: simpan.person.namaLengkap ?? hapus.person.namaLengkap,
        phone: simpan.person.phone ?? hapus.person.phone,
        nik: simpan.person.nik ?? hapus.person.nik,
      },
    });

    // Pegawai ikut terhapus lewat cascade dari Orang.
    await prisma.person.delete({ where: { id: hapus.personId } });
    console.log(`Digabung: ${NIP_HAPUS} (unit ${hapus.unitId}) → ${NIP_SIMPAN}`);
  }

  // Pastikan unit utama juga tercatat di pegawai_unit (untuk baris lama).
  if (simpan.unitId !== null) {
    await prisma.staffUnit.upsert({
      where: { staffId_unitId: { staffId: simpan.id, unitId: simpan.unitId } },
      create: {
        staffId: simpan.id,
        unitId: simpan.unitId,
        position: simpan.position,
        employeeNumber: simpan.employeeNumber,
        isPrimary: true,
      },
      update: { isPrimary: true },
    });
  }

  const akhir = await prisma.staff.findUnique({
    where: { employeeNumber: NIP_SIMPAN },
    include: { person: true, otherUnits: { include: { unit: true } } },
  });
  console.log(
    `${akhir?.person.fullName} (${akhir?.person.gelar ?? '-'}) bertugas di: ` +
      akhir?.otherUnits.map((u) => `${u.unit.nama}${u.isPrimary ? '*' : ''}`).join(', '),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
