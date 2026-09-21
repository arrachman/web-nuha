import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requirePage } from '@/lib/access';
import { readSession } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { bisaKoreksiOtomatis, estimasiTheta, rekapPeserta } from '@/lib/cbt';

/** Aksi pengelolaan CBT digerbangi menu `ujian` di server, lalu diaudit. */
export async function penjagaCbt(aksi: string, ringkasan: string, entitasId?: string) {
  const session = await requirePage('ujian');
  await recordAudit({
    aksi,
    entitas: 'cbt',
    entitasId,
    ringkasan,
    aktor: { id: session.userId, nama: session.nama },
  });
  return session;
}

/** Token sesi: huruf tanpa vokal mirip angka agar tidak salah baca saat didiktekan. */
export function tokenBaru(): string {
  const abjad = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let hasil = '';
  for (let i = 0; i < 6; i += 1) {
    hasil += abjad[Math.floor(Math.random() * abjad.length)];
  }
  return hasil;
}

/** Alamat pemanggil, untuk zone-locked exam dan jejak perangkat peserta. */
export async function ipPemanggil(): Promise<string> {
  const h = await headers();
  const maju = h.get('x-forwarded-for');
  if (maju) return maju.split(',')[0].trim();
  return h.get('x-real-ip') ?? 'tidak diketahui';
}

/**
 * Memastikan pemanggil benar-benar peserta sesi ini. Santri hanya boleh
 * menyentuh barisnya sendiri; identitas diambil dari sesi login, tidak pernah
 * dari form — kalau tidak, siapa pun bisa mengirim jawaban atas nama orang lain.
 */
export async function pesertaSaya(pesertaId: bigint) {
  const session = await readSession();
  if (!session) redirect('/login');

  const peserta = await prisma.pesertaCbt.findUnique({
    where: { id: pesertaId },
    include: {
      sesi: { include: { paket: true } },
      santri: { select: { id: true, person: { select: { user: { select: { id: true } } } } } },
    },
  });
  if (!peserta) redirect('/portal/santri');
  if (String(peserta.santri.person.user?.id ?? '') !== String(session.userId)) redirect('/portal/santri');
  return { session, peserta };
}

/**
 * Mencatat dugaan kecurangan. Klien tidak dipercaya menghitung sendiri: server
 * yang menambah penghitung dan membekukan sesi setelah batas terlampaui.
 */
export async function catatPelanggaran(pesertaId: bigint | string, jenis: string, detail?: string) {
  const id = typeof pesertaId === 'bigint' ? pesertaId : BigInt(pesertaId);
  const peserta = await prisma.pesertaCbt.findUnique({
    where: { id },
    include: { sesi: { select: { batasPelanggaran: true, kode: true } } },
  });
  if (!peserta) return;

  await prisma.logKecurangan.create({ data: { pesertaId: id, jenis, detail: detail ?? null } });
  const jumlah = peserta.pelanggaran + 1;
  const beku = jumlah >= peserta.sesi.batasPelanggaran;

  await prisma.pesertaCbt.update({
    where: { id },
    data: { pelanggaran: jumlah, status: beku ? 'Dibekukan' : peserta.status },
  });

  if (beku) {
    await recordAudit({
      aksi: 'BEKUKAN_CBT',
      entitas: 'cbt',
      entitasId: String(id),
      ringkasan: `Peserta dibekukan pada sesi ${peserta.sesi.kode} setelah ${jumlah} pelanggaran (${jenis})`,
    });
  }
}

/**
 * Menghitung ulang skor, rincian benar/salah, dan theta seorang peserta, lalu
 * menyalinnya ke `NilaiUjian` bila sesinya menempel pada sesi ujian resmi —
 * dengan begitu rapor dan analisis lama tetap menjadi satu sumber angka.
 */
export async function hitungUlangSkor(pesertaId: bigint) {
  const peserta = await prisma.pesertaCbt.findUnique({
    where: { id: pesertaId },
    include: {
      sesi: { select: { paketId: true, jadwalId: true } },
      jawaban: { include: { soal: { select: { id: true, tipe: true, irtA: true, irtB: true, irtC: true } } } },
    },
  });
  if (!peserta) return;

  const butir = await prisma.butirPaket.findMany({
    where: { paketId: peserta.sesi.paketId },
    select: { soalId: true, bobot: true },
  });
  const jawabanPer = new Map(peserta.jawaban.map((j) => [String(j.soalId), j]));

  const rekapMasuk = butir.map((b) => {
    const j = jawabanPer.get(String(b.soalId));
    const otomatis = j ? bisaKoreksiOtomatis(j.soal.tipe) : true;
    return {
      bobot: Number(b.bobot),
      benar: j ? (otomatis ? j.benar : null) : false,
      terjawab: Boolean(j?.jawaban && j.jawaban.trim() !== ''),
      skorManual: j && !otomatis ? (j.dinilaiOleh ? Number(j.skor) : null) : undefined,
    };
  });
  const hasil = rekapPeserta(rekapMasuk);

  // Theta hanya bermakna bila butirnya sudah punya parameter IRT terkalibrasi.
  const butirIrt = peserta.jawaban
    .filter((j) => j.benar !== null && j.soal.irtA !== null && j.soal.irtB !== null)
    .map((j) => ({
      a: Number(j.soal.irtA),
      b: Number(j.soal.irtB),
      c: Number(j.soal.irtC ?? 0),
      benar: j.benar === true,
    }));
  const theta = butirIrt.length > 0 ? estimasiTheta(butirIrt) : null;

  await prisma.pesertaCbt.update({
    where: { id: pesertaId },
    data: { skor: hasil.skor, benar: hasil.benar, salah: hasil.salah, kosong: hasil.kosong, theta },
  });

  if (peserta.sesi.jadwalId) {
    await prisma.nilaiUjian.upsert({
      where: { jadwalId_santriId: { jadwalId: peserta.sesi.jadwalId, santriId: peserta.santriId } },
      create: {
        jadwalId: peserta.sesi.jadwalId,
        santriId: peserta.santriId,
        nilai: hasil.skor,
        hadir: true,
        catatan: 'Dari CBT',
      },
      update: { nilai: hasil.skor, hadir: true, catatan: 'Dari CBT' },
    });
  }
}
