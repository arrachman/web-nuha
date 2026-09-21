/**
 * Helper bersama untuk menulis satu baris `GuardianRelation` (Ayah/Ibu/Wali) dari
 * importir siswa MA maupun SMP. `Orang` milik wali dikunci lewat NIK bila
 * tersedia (unik di seluruh tabel `Orang`); bila NIK kosong dipakai email
 * sintetis per-anak-per-peran supaya tetap idempoten tanpa menabrak wali
 * anak lain yang kebetulan nama/NIK-nya sama-sama kosong.
 */
import { prisma } from '@/lib/prisma';
import { JenisKelamin } from '@prisma/client';

export type DataWali = {
  nama: string;
  nik?: string | null;
  ttl?: string | null;
  pekerjaan?: string | null;
  pendidikan?: string | null;
  pendapatan?: string | null;
  hp?: string | null;
};

/** Peran wali: menentukan `hubungan`/`peran` di GuardianRelation dan `utama` (lihat `apakahUtama`). */
export type PeranWali = 'Ayah' | 'Ibu' | 'Wali';

/**
 * Ayah & Ibu selalu kontak utama. Wali pihak ketiga hanya jadi kontak utama
 * bila anak itu memang tidak punya relasi Ayah/Ibu — kasus form SMP yang cuma
 * menyediakan satu kolom "NAMA IBU/AYAH/WALI", sehingga satu-satunya kontak
 * yang tercatat harus tetap tampil di tab Wali & pemicu notifikasi.
 */
async function apakahUtama(anakOrangId: bigint, peran: PeranWali): Promise<boolean> {
  if (peran !== 'Wali') return true;
  const ortu = await prisma.guardianRelation.count({
    where: { anakId: anakOrangId, peran: { in: ['Ayah', 'Ibu'] } },
  });
  return ortu === 0;
}

/**
 * Upsert Orang (wali) + GuardianRelation untuk satu anak. Dilewati (return null)
 * bila `data.nama` kosong — banyak baris client tidak mengisi blok Wali
 * pihak ketiga sama sekali, itu bukan galat.
 */
export async function tulisGuardianRelation(
  anakOrangId: bigint,
  kunciAnakUntukEmail: string,
  peran: PeranWali,
  data: DataWali,
): Promise<void> {
  const nama = data.nama?.trim();
  if (!nama) return;

  const nik = data.nik?.trim() || null;
  const email = nik ? null : `wali.${kunciAnakUntukEmail}.${peran.toLowerCase()}@nuha.local`;

  const jk = peran === 'Ibu' ? JenisKelamin.P : JenisKelamin.L;
  /**
   * `jk` ikut dikoreksi saat update — bukan hanya saat create: importir yang
   * memakai kolom tunggal "wali" menulis peran `Wali` sehingga orangnya jatuh
   * ke default `L`. Ketika importir lain kemudian mengenali orang yang sama
   * sebagai Ibu (kunci NIK), jenis kelaminnya harus ikut benar. Peran `Wali`
   * sendiri tidak menyiratkan jenis kelamin, jadi ia tidak menimpa apa pun.
   */
  const updateGender = peran === 'Wali' ? {} : { gender: jk };

  const waliOrang = nik
    ? await prisma.person.upsert({
        where: { nik },
        create: { fullName: nama, gender: jk, nik, phone: data.hp?.trim() || null },
        update: { fullName: nama, phone: data.hp?.trim() || null, ...updateGender },
      })
    : await prisma.person.upsert({
        where: { email: email! },
        create: { fullName: nama, gender: jk, email, phone: data.hp?.trim() || null },
        update: { fullName: nama, phone: data.hp?.trim() || null, ...updateGender },
      });

  const utama = await apakahUtama(anakOrangId, peran);

  await prisma.guardianRelation.upsert({
    where: { waliId_anakId: { waliId: waliOrang.id, anakId: anakOrangId } },
    create: {
      waliId: waliOrang.id,
      anakId: anakOrangId,
      hubungan: peran,
      peran,
      pekerjaan: data.pekerjaan?.trim() || null,
      pendidikan: data.pendidikan?.trim() || null,
      pendapatan: data.pendapatan?.trim() || null,
      nik,
      ttl: data.ttl?.trim() || null,
      utama,
    },
    update: {
      hubungan: peran,
      peran,
      pekerjaan: data.pekerjaan?.trim() || null,
      pendidikan: data.pendidikan?.trim() || null,
      pendapatan: data.pendapatan?.trim() || null,
      nik,
      ttl: data.ttl?.trim() || null,
      utama,
    },
  });
}
