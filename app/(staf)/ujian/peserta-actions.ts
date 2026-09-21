'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { acakDeterministik, bisaKoreksiOtomatis, nilaiButir } from '@/lib/cbt';
import { catatPelanggaran, hitungUlangSkor, ipPemanggil, pesertaSaya } from './cbt-bersama';

/**
 * Peserta masuk ke sesi: token dicocokkan, jendela waktu dan kunci lokasi
 * ditegakkan di server. Urutan soal diacak sekali lalu disimpan, sehingga
 * refresh atau pindah perangkat tidak mengubah susunan soal.
 */
export async function mulaiKerja(formData: FormData) {
  const pesertaId = BigInt(String(formData.get('pesertaId') ?? '0'));
  const token = String(formData.get('token') ?? '').trim().toUpperCase();
  if (!pesertaId) return;

  const { session, peserta } = await pesertaSaya(pesertaId);
  const { sesi } = peserta;

  if (peserta.status === 'Dibekukan') return;
  if (sesi.status !== 'Berjalan') return;
  if (sesi.token.toUpperCase() !== token) {
    await catatPelanggaran(pesertaId, 'TOKEN_SALAH', 'Token tidak cocok');
    revalidatePath('/portal/santri');
    return;
  }

  const kini = new Date();
  if (kini < sesi.mulai || kini > sesi.selesai) return;

  const ip = await ipPemanggil();
  if (sesi.ipPrefix && !ip.startsWith(sesi.ipPrefix)) {
    await catatPelanggaran(pesertaId, 'DI_LUAR_ZONA', `IP ${ip} di luar ${sesi.ipPrefix}`);
    revalidatePath('/portal/santri');
    return;
  }

  // Urutan hanya dibuat sekali; masuk ulang memakai urutan yang sama.
  let urutan = peserta.urutan;
  if (!urutan) {
    const butir = await prisma.butirPaket.findMany({
      where: { paketId: sesi.paketId },
      orderBy: { urutan: 'asc' },
      select: { soalId: true },
    });
    const ids = butir.map((b) => String(b.soalId));
    urutan = JSON.stringify(sesi.paket.acakSoal ? acakDeterministik(ids, peserta.id) : ids);
  }

  await prisma.pesertaCbt.update({
    where: { id: pesertaId },
    data: { status: 'Mengerjakan', mulaiAt: peserta.mulaiAt ?? kini, urutan, ipTerakhir: ip },
  });
  await recordAudit({
    aksi: 'MULAI_CBT',
    entitas: 'cbt',
    entitasId: String(pesertaId),
    ringkasan: `${session.nama} masuk sesi ${sesi.kode}`,
    aktor: { id: session.userId, nama: session.nama },
    ip,
  });
  revalidatePath('/portal/santri');
}

/** Menyimpan satu jawaban (autosave). Koreksi otomatis langsung dihitung. */
export async function simpanJawaban(formData: FormData) {
  const pesertaId = BigInt(String(formData.get('pesertaId') ?? '0'));
  const soalId = BigInt(String(formData.get('soalId') ?? '0'));
  if (!pesertaId || !soalId) return;

  const { peserta } = await pesertaSaya(pesertaId);
  // Sesi yang sudah lewat batas waktu tidak menerima jawaban baru walau
  // halaman peserta masih terbuka.
  if (peserta.status !== 'Mengerjakan') return;
  if (new Date() > peserta.sesi.selesai) return;

  const soal = await prisma.soal.findUnique({
    where: { id: soalId },
    include: { opsi: { select: { label: true, benar: true } } },
  });
  if (!soal) return;

  // Soal di luar paket sesi ini tidak boleh disisipkan lewat form.
  const butir = await prisma.butirPaket.findUnique({
    where: { paketId_soalId: { paketId: peserta.sesi.paketId, soalId } },
    select: { bobot: true },
  });
  if (!butir) return;

  const mentah = formData.get('jawaban');
  const jawaban = mentah === null ? null : String(mentah);
  const ragu = formData.get('ragu') !== null;

  const benar = nilaiButir({ tipe: soal.tipe, kunci: soal.kunci, opsi: soal.opsi }, jawaban);
  const otomatis = bisaKoreksiOtomatis(soal.tipe);
  const skor = benar === true ? Number(butir.bobot) : 0;

  await prisma.jawabanPeserta.upsert({
    where: { pesertaId_soalId: { pesertaId, soalId } },
    create: { pesertaId, soalId, jawaban, ragu, benar, skor: otomatis ? skor : 0 },
    // Esai tetap memakai skor guru agar autosave tidak menimpanya dengan nol.
    update: { jawaban, ragu, benar, ...(otomatis ? { skor } : {}) },
  });
  revalidatePath('/portal/santri');
}

/** Peserta mengakhiri ujian; skor dan theta dihitung lalu sesinya dikunci. */
export async function selesaikanKerja(formData: FormData) {
  const pesertaId = BigInt(String(formData.get('pesertaId') ?? '0'));
  if (!pesertaId) return;

  const { session, peserta } = await pesertaSaya(pesertaId);
  if (peserta.status === 'Selesai') return;

  await prisma.pesertaCbt.update({
    where: { id: pesertaId },
    data: { status: 'Selesai', selesaiAt: new Date() },
  });
  await hitungUlangSkor(pesertaId);
  await recordAudit({
    aksi: 'SELESAI_CBT',
    entitas: 'cbt',
    entitasId: String(pesertaId),
    ringkasan: `${session.nama} menyelesaikan sesi ${peserta.sesi.kode}`,
    aktor: { id: session.userId, nama: session.nama },
  });
  revalidatePath('/portal/santri');
  revalidatePath('/ujian');
}

/**
 * Dipanggil dari pengawasan sisi klien (pindah tab, keluar fullscreen, tempel
 * teks). Identitas tetap diperiksa di server: peserta hanya bisa melaporkan
 * pelanggaran atas dirinya sendiri.
 */
export async function laporPelanggaran(formData: FormData) {
  const pesertaId = BigInt(String(formData.get('pesertaId') ?? '0'));
  const jenis = String(formData.get('jenis') ?? 'TIDAK_DIKENAL');
  if (!pesertaId) return;
  await pesertaSaya(pesertaId);
  const detail = String(formData.get('detail') ?? '').slice(0, 255);
  await catatPelanggaran(pesertaId, jenis, detail || undefined);
  revalidatePath('/portal/santri');
}
