import { StatusSantri } from '@prisma/client';
import { recordAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';

const UNIT_MADIN_ID = 4;
const ORANG_ID_ALUMNI = [
  596, 605, 606, 612, 626, 639, 641, 643, 644, 645, 648, 651, 654, 656, 665, 672, 683, 702,
  597, 599, 638, 652, 659, 674, 676, 693,
  593, 594, 601, 603, 614, 628, 631, 647, 646, 650, 653, 658, 661, 667, 673, 677, 678, 679, 689, 695, 696,
  608, 609, 617, 618, 630, 636, 640, 642, 668, 669, 670, 704,
  592, 607, 613, 615, 624, 627, 632, 634, 649, 660, 666, 671, 681, 688, 691, 692, 697, 698, 699,
  591, 598, 619, 621, 623, 635, 655, 657, 662, 664, 675, 682, 685, 700, 701, 703,
  499,
] as const;
const JUMLAH_DIHARAPKAN = ORANG_ID_ALUMNI.length; // 95 nama unik dari daftar operator; "Ali Wafa" muncul dua kali di sumber.
const AKTOR_SKRIP = { nama: 'Penetapan alumni Madin (skrip)' };

async function main(): Promise<void> {
  const alumni = await prisma.person.findMany({
    where: {
      id: { in: ORANG_ID_ALUMNI.map(BigInt) },
      riwayatPendidikan: { some: { unitId: UNIT_MADIN_ID, status: StatusSantri.TidakAktif } },
    },
    select: { id: true, fullName: true, santri: { select: { id: true, status: true } } },
    orderBy: { fullName: 'asc' },
  });

  if (alumni.length !== JUMLAH_DIHARAPKAN) {
    throw new Error(`Validasi gagal: ditemukan ${alumni.length} alumni Madin; harus tepat ${JUMLAH_DIHARAPKAN}.`);
  }

  let dibuat = 0;
  for (const orang of alumni) {
    if (orang.santri) {
      if (orang.santri.status !== StatusSantri.TidakAktif) {
        throw new Error(`Validasi gagal: "${orang.fullName}" sudah berstatus ${orang.santri.status}, bukan Alumni.`);
      }
      continue;
    }

    const santri = await prisma.santri.create({
      data: {
        personId: orang.id,
        unitId: UNIT_MADIN_ID,
        status: StatusSantri.TidakAktif,
      },
    });
    dibuat += 1;

    await recordAudit({
      aksi: 'create',
      entitas: 'Santri',
      entitasId: String(santri.id),
      ringkasan: `Tetapkan "${orang.fullName}" sebagai alumni Madin.`,
      perubahan: { ke: { unitId: UNIT_MADIN_ID, status: StatusSantri.TidakAktif } },
      aktor: AKTOR_SKRIP,
    });
  }

  const total = await prisma.santri.count({
    where: {
      person: { riwayatPendidikan: { some: { unitId: UNIT_MADIN_ID, status: StatusSantri.TidakAktif } } },
      kelasLain: { none: { unitId: UNIT_MADIN_ID } },
    },
  });

  if (total !== JUMLAH_DIHARAPKAN) {
    throw new Error(`Verifikasi gagal: alumni Madin terbaca ${total}; harus ${JUMLAH_DIHARAPKAN}.`);
  }

  console.log(`Selesai: ${dibuat} santri baru ditetapkan sebagai alumni Madin; total alumni Madin ${total}.`);
}

main()
  .catch((error) => {
    console.error('Gagal menetapkan alumni Madin:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
