/**
 * Buat akun portal (User) untuk santri SMP hasil `import-siswa-smp.ts` beserta
 * wali-nya, mengikuti konvensi yang sama dengan `prisma/seed.ts`
 * (`seedAkunUtama`): username `santri.<nis>` / `wali.<nis>`, sandi bawaan
 * `Nuha2026!`.
 *
 * BEDA dengan seed.ts: form pendataan SMP hanya punya SATU kolom
 * "NAMA IBU/AYAH/WALI" (bukan blok Ayah/Ibu terpisah), sehingga
 * `tulisGuardianRelation` menulisnya dengan `peran: 'Wali'` dan `utama: false`
 * (lihat `import/lib/tulis-wali.ts`). Logika akun wali di seed.ts hanya
 * mengambil relasi `utama: true`, jadi wali-wali ini TIDAK otomatis dapat
 * akun dari seed — skrip ini secara eksplisit memakai relasi `peran: 'Wali'`
 * sebagai pemegang akun tunggal per santri, sudah sesuai dengan bentuk
 * datanya (satu kontak wali per santri).
 *
 * Santri alumni TETAP dibuatkan akun (portal alumni tetap relevan untuk
 * lihat riwayat), tapi bila client kelak menutup akses portal alumni,
 * lakukan itu lewat kolom `user.aktif`, bukan dengan menghapus baris ini.
 *
 * Jalankan: `npx tsx prisma/import/set-akun-siswa-smp.ts`
 */
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

async function jalankan(): Promise<void> {
  const unit = await prisma.unit.findUniqueOrThrow({ where: { key: 'SMP' } });
  const [roleSantri, roleWali] = await Promise.all([
    prisma.role.findUniqueOrThrow({ where: { key: 'santri' } }),
    prisma.role.findUniqueOrThrow({ where: { key: 'wali' } }),
  ]);
  const passwordHash = await bcrypt.hash('Nuha2026!', 12);

  const santriRows = await prisma.santri.findMany({
    where: { unitId: unit.id },
    include: { person: true },
  });

  let akunSantriDibuat = 0;
  let akunWaliDibuat = 0;
  let waliTanpaKontak = 0;

  for (const santri of santriRows) {
    if (!santri.nis) continue;

    const userSantri = await prisma.user.upsert({
      where: { personId: santri.personId },
      create: {
        personId: santri.personId,
        email: santri.person.email ?? `santri.${santri.nis}@nuha.local`,
        username: `santri.${santri.nis}`,
        passwordHash,
      },
      update: { username: `santri.${santri.nis}` },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: userSantri.id, roleId: roleSantri.id } },
      create: { userId: userSantri.id, roleId: roleSantri.id },
      update: {},
    });
    akunSantriDibuat += 1;

    const guardianRelation = await prisma.guardianRelation.findFirst({
      where: { anakId: santri.personId, peran: 'Wali' },
      include: { wali: true },
      orderBy: { id: 'asc' },
    });
    if (!guardianRelation) {
      waliTanpaKontak += 1;
      continue;
    }

    const userWali = await prisma.user.upsert({
      where: { personId: guardianRelation.waliId },
      create: {
        personId: guardianRelation.waliId,
        email: guardianRelation.wali.email ?? `wali.${santri.nis}@nuha.local`,
        username: `wali.${santri.nis}`,
        passwordHash,
      },
      update: { username: `wali.${santri.nis}` },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: userWali.id, roleId: roleWali.id } },
      create: { userId: userWali.id, roleId: roleWali.id },
      update: {},
    });
    akunWaliDibuat += 1;
  }

  if (waliTanpaKontak > 0) {
    console.error(`${waliTanpaKontak} santri tidak punya relasi wali (peran="Wali") — dilewati, tidak dibuatkan akun wali.`);
  }
  console.log(`Selesai. Akun santri: ${akunSantriDibuat}. Akun wali: ${akunWaliDibuat}. Sandi bawaan: Nuha2026!`);
}

jalankan()
  .catch((error) => {
    console.error('Galat tak terduga saat membuat akun santri/wali SMP:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
