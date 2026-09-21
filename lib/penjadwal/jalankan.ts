import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logger';
import { kirimWa, renderTemplate } from '@/lib/wa';
import { cocokkanCron } from '@/lib/penjadwal/cron';
import { sekarangWib, besokWib, namaHariPiket, namaHariPelajaran, type WaktuWib } from '@/lib/penjadwal/waktu';
import { bangunPesanPiketH1, bangunPesanPiketH0, type PesanPiket } from '@/lib/penjadwal/piket';
import { bangunPesanNgajar, type PesanNgajar } from '@/lib/penjadwal/ngajar';
import { pisahkanBerdasarkanHp } from '@/lib/penjadwal/kontak';

const AKTOR_CRON = { nama: 'Penjadwal notifikasi (cron)' };
const TEMPLATE_PIKET = 'WA-GUR-04';
const TEMPLATE_NGAJAR = 'WA-GUR-05';

type HasilJob = { terkirim: number; dilewatiTanpaHp: number; sudahAda: number; tanpaPegawai: number };
export type RingkasanTick = { waktu: WaktuWib; jobs: (HasilJob & { kodeTemplate: string })[] };

function kosong(tanpaPegawai = 0): HasilJob {
  return { terkirim: 0, dilewatiTanpaHp: 0, sudahAda: 0, tanpaPegawai };
}

/**
 * Antre + kirim SATU pesan lewat kunci idempoten `@@unique([kodeTemplate,
 * tujuanId, tanggalJadwal])`. Insert dulu (tangkap P2002 = sudah pernah
 * diproses, lewati diam-diam — ini bukan galat, ini penjadwal jalan lagi),
 * baru kirim setelah insert sukses — supaya dua proses yang balapan tidak
 * pernah mengirim dua kali untuk kunci yang sama.
 */
async function antreDanKirim(params: {
  kodeJob: string;
  tujuanId: string;
  tanggalJadwal: string;
  nomorHp: string | null;
  templateKode: string;
  tujuanLabel: string;
  nilai: Record<string, string | number>;
}): Promise<'terkirim' | 'dilewati-tanpa-hp' | 'sudah-ada'> {
  let baris;
  try {
    baris = await prisma.notificationQueue.create({
      data: { templateCode: params.kodeJob, recipientId: params.tujuanId, scheduledDate: new Date(`${params.tanggalJadwal}T00:00:00.000Z`) },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return 'sudah-ada';
    throw error;
  }

  if (!params.nomorHp) {
    await prisma.notificationQueue.update({ where: { id: baris.id }, data: { status: 'DilewatiTanpaHp' } });
    return 'dilewati-tanpa-hp';
  }

  const template = await prisma.waTemplate.findUnique({ where: { code: params.templateKode } });
  if (!template) {
    log('error', `Template WA "${params.templateKode}" tidak ditemukan — pesan penjadwal dibatalkan`, { kodeJob: params.kodeJob });
    await prisma.notificationQueue.update({ where: { id: baris.id }, data: { status: 'GagalTemplateHilang' } });
    return 'dilewati-tanpa-hp';
  }

  const hasil = await kirimWa({
    nomor: params.nomorHp,
    tujuan: params.tujuanLabel,
    isi: renderTemplate(template.content, params.nilai),
    templateId: template.id,
    actor: AKTOR_CRON,
  });
  await prisma.notificationQueue.update({ where: { id: baris.id }, data: { status: hasil.entry.status, waLogId: hasil.entry.id } });
  return 'terkirim';
}

async function jalankanPiketH1(kodeJob: string): Promise<HasilJob> {
  const besok = besokWib();
  const hariNama = namaHariPiket(besok.hariIndex);
  const rows = await prisma.jadwalPiket.findMany({
    where: { hari: hariNama },
    include: { staff: { include: { person: true } } },
  });
  const shifts = rows.map((r) => ({
    hari: r.hari,
    waktuMulai: r.waktuMulai,
    waktuSelesai: r.waktuSelesai,
    pegawaiId: r.staffId?.toString() ?? null,
    namaPegawai: r.staff?.person.fullName ?? null,
    hp: r.staff?.person.phone ?? null,
  }));
  const { pesan, tanpaPegawai } = bangunPesanPiketH1(shifts);
  return kirimSemuaPiket(kodeJob, pesan, besok.tanggal, tanpaPegawai);
}

async function jalankanPiketH0(kodeJob: string): Promise<HasilJob> {
  const now = sekarangWib();
  const hariNama = namaHariPiket(now.hariIndex);
  const rows = await prisma.jadwalPiket.findMany({
    where: { hari: hariNama },
    include: { staff: { include: { person: true } } },
  });
  const shifts = rows.map((r) => ({
    hari: r.hari,
    waktuMulai: r.waktuMulai,
    waktuSelesai: r.waktuSelesai,
    pegawaiId: r.staffId?.toString() ?? null,
    namaPegawai: r.staff?.person.fullName ?? null,
    hp: r.staff?.person.phone ?? null,
  }));
  const { pesan, tanpaPegawai } = bangunPesanPiketH0(shifts, now.jam, now.menit);
  return kirimSemuaPiket(kodeJob, pesan, now.tanggal, tanpaPegawai);
}

async function kirimSemuaPiket(kodeJob: string, pesan: PesanPiket[], tanggalJadwal: string, tanpaPegawai: number): Promise<HasilJob> {
  const { siapKirim, tanpaHp } = pisahkanBerdasarkanHp(pesan);
  const hasil = kosong(tanpaPegawai);
  hasil.dilewatiTanpaHp += tanpaHp.length;

  for (const p of [...siapKirim, ...tanpaHp]) {
    const status = await antreDanKirim({
      kodeJob,
      tujuanId: p.tujuanId,
      tanggalJadwal,
      nomorHp: p.hp,
      templateKode: TEMPLATE_PIKET,
      tujuanLabel: p.nama,
      nilai: { nama: p.nama, hari: p.hari, jamMulai: p.jamMulai, jamSelesai: p.jamSelesai, catatan: p.catatan },
    });
    if (status === 'terkirim') hasil.terkirim++;
    else if (status === 'sudah-ada') hasil.sudahAda++;
    // 'dilewati-tanpa-hp' sudah dihitung lewat tanpaHp.length di atas.
  }

  if (hasil.dilewatiTanpaHp > 0) {
    log('warn', `${kodeJob}: ${hasil.dilewatiTanpaHp} guru dilewati — belum ada nomor HP`, { kodeJob, tanggalJadwal });
  }
  if (hasil.tanpaPegawai > 0) {
    log('info', `${kodeJob}: ${hasil.tanpaPegawai} shift dilewati — belum ada guru piket ditugaskan`, { kodeJob, tanggalJadwal });
  }
  return hasil;
}

async function jalankanNgajar(kodeJob: string): Promise<HasilJob> {
  const now = sekarangWib();
  const hariNama = namaHariPelajaran(now.hariIndex);
  const rows = await prisma.jadwalPelajaran.findMany({
    where: { hari: hariNama },
    include: { staff: { include: { person: true } } },
    orderBy: { jamKe: 'asc' },
  });
  const slots = rows.map((r) => ({
    hari: r.hari,
    pegawaiId: r.staffId?.toString() ?? null,
    namaPegawai: r.staff?.person.fullName ?? null,
    hp: r.staff?.person.phone ?? null,
    jamKe: r.jamKe,
    waktu: r.waktu,
    mapel: r.mapel,
    kelas: r.kelas,
  }));
  const { pesan, tanpaPegawai } = bangunPesanNgajar(slots, hariNama);
  return kirimSemuaNgajar(kodeJob, pesan, now.tanggal, tanpaPegawai);
}

async function kirimSemuaNgajar(kodeJob: string, pesan: PesanNgajar[], tanggalJadwal: string, tanpaPegawai: number): Promise<HasilJob> {
  const { siapKirim, tanpaHp } = pisahkanBerdasarkanHp(pesan);
  const hasil = kosong(tanpaPegawai);
  hasil.dilewatiTanpaHp += tanpaHp.length;

  for (const p of [...siapKirim, ...tanpaHp]) {
    const status = await antreDanKirim({
      kodeJob,
      tujuanId: p.tujuanId,
      tanggalJadwal,
      nomorHp: p.hp,
      templateKode: TEMPLATE_NGAJAR,
      tujuanLabel: p.nama,
      nilai: { nama: p.nama, hari: p.hari, daftarJam: p.daftarJam },
    });
    if (status === 'terkirim') hasil.terkirim++;
    else if (status === 'sudah-ada') hasil.sudahAda++;
  }

  if (hasil.dilewatiTanpaHp > 0) {
    log('warn', `${kodeJob}: ${hasil.dilewatiTanpaHp} guru dilewati — belum ada nomor HP`, { kodeJob, tanggalJadwal });
  }
  if (hasil.tanpaPegawai > 0) {
    log('info', `${kodeJob}: ${hasil.tanpaPegawai} slot jadwal dilewati — pegawai belum termapping`, { kodeJob, tanggalJadwal });
  }
  return hasil;
}

async function jalankanSatuJob(kodeJob: string): Promise<HasilJob> {
  switch (kodeJob) {
    case 'WA-GUR-04-H1':
      return jalankanPiketH1(kodeJob);
    case 'WA-GUR-04-H0':
      return jalankanPiketH0(kodeJob);
    case 'WA-GUR-05':
      return jalankanNgajar(kodeJob);
    default:
      log('warn', `Job penjadwal tak dikenal, dilewati: ${kodeJob}`);
      return kosong();
  }
}

/** Satu "tick": cek seluruh job aktif, jalankan yang cron-nya cocok waktu WIB sekarang. */
export async function jalankanTick(): Promise<RingkasanTick> {
  const waktu = sekarangWib();
  const jobs = await prisma.notificationSchedule.findMany({ where: { isActive: true } });
  const ringkasan: RingkasanTick = { waktu, jobs: [] };

  for (const job of jobs) {
    if (!cocokkanCron(job.cron, waktu)) continue;
    const hasil = await jalankanSatuJob(job.templateCode);
    await prisma.notificationSchedule.update({ where: { id: job.id }, data: { lastRunAt: new Date() } });
    ringkasan.jobs.push({ kodeTemplate: job.templateCode, ...hasil });
    log('info', `Job ${job.templateCode} selesai`, { ...hasil });
  }

  return ringkasan;
}
