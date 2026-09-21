/**
 * Tetapkan anggota kelas I'dad Madin sesuai daftar resmi (23 santri).
 *
 * Sebagian besar dari mereka adalah siswa SMP yang juga mengaji di Madin. Sejak
 * migrasi `santri_multi_kelas`, satu santri bisa menempati lebih dari satu
 * rombel, jadi mereka DITAMBAHKAN ke I'dad tanpa melepas kelas SMP-nya —
 * penempatan utama (`santri.unitId/kelasId`) sengaja tidak diubah.
 *
 * Santri di I'dad yang tidak ada di daftar akan dilepas dari kelas itu saja
 * (baris `santri_kelas`-nya dihapus), bukan dihapus dari sistem.
 *
 * Idempoten: aman dijalankan ulang.
 *
 *   npx tsx prisma/import/kelas-idad-madin.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Daftar resmi anggota kelas I'dad. Dicocokkan lewat NIS supaya kebal terhadap
 * beda penulisan nama ("M Ilham" vs "Muhammad Ilham"). */
const ANGGOTA: { nis: string; nama: string }[] = [
  { nis: '2025PONDOK001', nama: 'Ahmad Arif' },
  { nis: '2025PONDOK002', nama: 'Ahmad Syafly Al-Kautsar' },
  { nis: '0132296459', nama: 'Alissa Nada Salsabila' },
  { nis: '3138417745', nama: 'Almira Azzahra Ramadhan' },
  { nis: '0117687111', nama: 'Anando Rafa Hariyanto' },
  { nis: '0118038086', nama: 'Arkaan Muhammad Zufar' },
  { nis: '2025PONDOK007', nama: 'Bilqis Aulia Izatun N.A' },
  { nis: '0122280315', nama: 'Fadli Al Farisy' },
  { nis: '0129700926', nama: 'Farzan Ahmad Khalfani' },
  { nis: '0128835624', nama: 'Gilang Rezky Maulana' },
  { nis: '2025PONDOK011', nama: 'Kholidul Asyhar' },
  { nis: '0125589477', nama: 'Muhammad Fattah Maksum' },
  { nis: '0131601916', nama: 'Muhammad Ilham Arifin' },
  { nis: '0133206091', nama: 'Muhammad Irham Arifin' },
  { nis: '2025PONDOK015', nama: 'M. Faris Aufa S.' },
  { nis: '0128156296', nama: "Muhammad Abdun Nafi'" },
  { nis: '0122617354', nama: "Muhammad Anis Musyaffa'" },
  { nis: '2025PONDOK018', nama: 'Muhammad Kenzhi Putra' },
  { nis: '0114036923', nama: 'Muhammad Nawwaf Al Hasani' },
  { nis: '3505125704120001', nama: 'Nadhifa Fauchatul Qudsiyah' },
  { nis: '3137037032', nama: 'Queen Ulumi Dzakiya' },
  { nis: '3129591929', nama: 'Rachel Maryam' },
  { nis: '0133880911', nama: 'Zalfa Alfina Leksono' },
];

async function main() {
  const unit = await prisma.unit.findFirst({ where: { nama: 'Madin' } });
  if (!unit) throw new Error('Unit Madin tidak ditemukan');

  // Kelas I'dad sempat kembar (#36 kosong, #37 berisi). Yang dipakai adalah
  // yang sudah berisi santri; bila sama-sama kosong, ambil id terkecil.
  const kandidat = await prisma.kelas.findMany({
    where: { unitId: unit.id, tingkat: '0' },
    include: { _count: { select: { santriKelas: true } } },
    orderBy: { id: 'asc' },
  });
  if (!kandidat.length) throw new Error("Kelas I'dad Madin tidak ditemukan");
  const kelas = kandidat.find((k) => k._count.santriKelas > 0) ?? kandidat[0];
  if (kandidat.length > 1) {
    console.log(`! kelas I'dad kembar: ${kandidat.map((k) => `#${k.id}(${k._count.santriKelas})`).join(', ')} — dipakai #${kelas.id}`);
  }

  let tambah = 0;
  let sudah = 0;
  const hilang: string[] = [];
  const idTarget = new Set<bigint>();

  for (const a of ANGGOTA) {
    const santri = await prisma.santri.findUnique({ where: { nis: a.nis }, select: { id: true, person: { select: { fullName: true } } } });
    if (!santri) { hilang.push(`${a.nis} ${a.nama}`); continue; }
    idTarget.add(santri.id);

    const ada = await prisma.santriKelas.findUnique({
      where: { santriId_kelasId: { santriId: santri.id, kelasId: kelas.id } },
    });
    if (ada) { sudah += 1; continue; }

    // `utama` dibiarkan false: penempatan utama mereka tetap di SMP/MA.
    await prisma.santriKelas.create({
      data: { santriId: santri.id, kelasId: kelas.id, unitId: unit.id, utama: false },
    });
    tambah += 1;
    console.log(`+ ${a.nis} ${santri.person.fullName}`);
  }

  // Lepas anggota yang tidak ada di daftar — dari kelas ini saja.
  const asing = await prisma.santriKelas.findMany({
    where: { kelasId: kelas.id, santriId: { notIn: [...idTarget] } },
    select: { santriId: true, santri: { select: { nis: true, person: { select: { fullName: true } } } } },
  });
  for (const x of asing) {
    await prisma.santriKelas.delete({ where: { santriId_kelasId: { santriId: x.santriId, kelasId: kelas.id } } });
    console.log(`- ${x.santri.nis} ${x.santri.person.fullName} (dilepas dari I'dad)`);
  }

  const total = await prisma.santriKelas.count({ where: { kelasId: kelas.id } });
  console.log(`\nkelas #${kelas.id} "${kelas.nama}": +${tambah} baru, ${sudah} sudah ada, -${asing.length} dilepas → total ${total}`);
  if (hilang.length) console.log(`! NIS tidak ditemukan (${hilang.length}): ${hilang.join('; ')}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
