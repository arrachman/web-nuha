'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { analisisButir, kalibrasiAwal } from '@/lib/cbt';
import { hitungUlangSkor, penjagaCbt, tokenBaru } from './cbt-bersama';

const STATUS_SESI = ['Terjadwal', 'Berjalan', 'Selesai', 'Dibatalkan'] as const;

export async function ubahStatusSesi(formData: FormData) {
  const id = Number(formData.get('id'));
  const status = String(formData.get('status') ?? '');
  if (!id || !STATUS_SESI.includes(status as (typeof STATUS_SESI)[number])) return;

  const sesi = await prisma.sesiCbt.findUnique({
    where: { id },
    include: { paket: { select: { nama: true } }, kelas: { select: { nama: true } } },
  });
  if (!sesi) return;

  await penjagaCbt('UBAH_STATUS_SESI_CBT', `${sesi.paket.nama} · ${sesi.kelas.nama} → ${status}`, String(id));
  await prisma.sesiCbt.update({ where: { id }, data: { status } });
  revalidatePath('/ujian');
}

/** Memutar token sesi; peserta yang sudah masuk tidak terganggu. */
export async function putarToken(formData: FormData) {
  const id = Number(formData.get('id'));
  if (!id) return;
  await penjagaCbt('PUTAR_TOKEN_CBT', `Sesi #${id} token diputar`, String(id));
  await prisma.sesiCbt.update({ where: { id }, data: { token: tokenBaru() } });
  revalidatePath('/ujian');
}

/**
 * Menerbitkan daftar peserta satu sesi dari anggota kelasnya. Idempoten:
 * dijalankan ulang hanya menambah santri baru, tidak menghapus yang sudah
 * mengerjakan.
 */
export async function terbitkanPeserta(formData: FormData) {
  const sesiId = Number(formData.get('sesiId'));
  if (!sesiId) return;

  const sesi = await prisma.sesiCbt.findUnique({
    where: { id: sesiId },
    include: {
      kelas: { include: { santri: { select: { id: true, nis: true }, orderBy: { nis: 'asc' } } } },
    },
  });
  if (!sesi) return;

  await penjagaCbt(
    'TERBITKAN_PESERTA_CBT',
    `Sesi ${sesi.kode}: ${sesi.kelas.santri.length} peserta`,
    String(sesiId),
  );

  for (const [i, santri] of sesi.kelas.santri.entries()) {
    const noPeserta = `${sesi.kode}-${String(i + 1).padStart(3, '0')}`;
    await prisma.pesertaCbt.upsert({
      where: { sesiId_santriId: { sesiId, santriId: santri.id } },
      create: { sesiId, santriId: santri.id, noPeserta },
      update: {},
    });
  }
  revalidatePath('/ujian');
}

/** Membuka kembali peserta yang dibekukan karena pelanggaran. */
export async function bukaBekuan(formData: FormData) {
  const pesertaId = BigInt(String(formData.get('pesertaId') ?? '0'));
  if (!pesertaId) return;

  const peserta = await prisma.pesertaCbt.findUnique({
    where: { id: pesertaId },
    include: { santri: { include: { person: { select: { fullName: true } } } } },
  });
  if (!peserta) return;

  await penjagaCbt(
    'BUKA_BEKUAN_CBT',
    `${peserta.santri.person.fullName} dibuka kembali (${peserta.pelanggaran} pelanggaran)`,
    String(pesertaId),
  );
  await prisma.pesertaCbt.update({
    where: { id: pesertaId },
    data: { status: 'Mengerjakan', pelanggaran: 0 },
  });
  revalidatePath('/ujian');
}

/** Guru menilai satu jawaban esai; skor peserta langsung dihitung ulang. */
export async function nilaiEsai(formData: FormData) {
  const jawabanId = BigInt(String(formData.get('jawabanId') ?? '0'));
  const skor = Number(formData.get('skor'));
  if (!jawabanId || !Number.isFinite(skor) || skor < 0) return;

  const jawaban = await prisma.jawabanPeserta.findUnique({
    where: { id: jawabanId },
    include: { soal: { select: { bobot: true } } },
  });
  if (!jawaban) return;
  if (skor > Number(jawaban.soal.bobot)) return;

  const session = await penjagaCbt(
    'NILAI_ESAI_CBT',
    `Jawaban #${jawabanId} diberi skor ${skor}`,
    String(jawabanId),
  );
  await prisma.jawabanPeserta.update({
    where: { id: jawabanId },
    data: { skor, benar: skor > 0, dinilaiOleh: session.nama ?? null },
  });
  await hitungUlangSkor(jawaban.pesertaId);
  revalidatePath('/ujian');
}

/**
 * Menjalankan analisis butir untuk satu paket dan menyimpan p, D, serta
 * parameter IRT awal ke setiap soal. Hanya sesi yang sudah Selesai dipakai
 * supaya jawaban yang masih berjalan tidak mencemari statistik.
 */
export async function analisisPaket(formData: FormData) {
  const paketId = Number(formData.get('paketId'));
  if (!paketId) return;

  const paket = await prisma.paketSoal.findUnique({
    where: { id: paketId },
    include: { butir: { include: { soal: { select: { id: true, tipe: true } } } } },
  });
  if (!paket) return;

  await penjagaCbt('ANALISIS_BUTIR_CBT', `Paket ${paket.kode}: ${paket.butir.length} butir`, String(paketId));

  const peserta = await prisma.pesertaCbt.findMany({
    where: { sesi: { paketId }, status: 'Selesai' },
    select: { id: true, skor: true },
  });
  // Analisis butir pada sampel sangat kecil menyesatkan; lebih baik tidak ada
  // angka daripada angka yang tak bisa dipercaya.
  if (peserta.length < 4) return;
  const skorTotal = new Map(peserta.map((p) => [String(p.id), Number(p.skor)]));

  for (const butir of paket.butir) {
    const jawaban = await prisma.jawabanPeserta.findMany({
      where: { soalId: butir.soal.id, pesertaId: { in: peserta.map((p) => p.id) } },
      select: { pesertaId: true, benar: true },
    });
    const respon = jawaban
      .filter((j) => j.benar !== null)
      .map((j) => ({ benar: j.benar === true, skorTotal: skorTotal.get(String(j.pesertaId)) ?? 0 }));

    const stat = analisisButir(respon);
    if (!stat) continue;
    const irt = kalibrasiAwal(stat.p, stat.d, butir.soal.tipe);
    await prisma.soal.update({
      where: { id: butir.soal.id },
      data: { pDiff: stat.p, dIndex: stat.d, irtA: irt.a, irtB: irt.b, irtC: irt.c },
    });
  }
  revalidatePath('/ujian');
}
