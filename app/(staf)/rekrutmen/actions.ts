'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { readSession } from '@/lib/auth';
import { requireAction } from '@/lib/access';
import { recordAudit } from '@/lib/audit';
import type { ApplicationStatus } from '@prisma/client';

async function aktor() {
  const session = await readSession();
  return session ? { id: session.userId, nama: session.nama } : null;
}

/** Buat lowongan baru berstatus Draft (03 §3). Panitia mengajukan persetujuan lewat ajukanLowongan(). */
export async function buatLowongan(formData: FormData) {
  const session = await requireAction('rekrutmen.job_manage');

  const unitId = Number(formData.get('unitId'));
  const openAt = new Date(String(formData.get('openAt')));
  const closeAt = new Date(String(formData.get('closeAt')));
  if (!unitId || !openAt.getTime() || !closeAt.getTime() || closeAt <= openAt) {
    throw new Error('Data lowongan tidak lengkap atau tanggal tutup harus setelah tanggal buka.');
  }

  const tahun = new Date().getFullYear();
  const prefix = `LOW-${tahun}-`;
  const terakhir = await prisma.jobPosting.findFirst({ where: { code: { startsWith: prefix } }, orderBy: { id: 'desc' }, select: { code: true } });
  const nomorTerakhir = terakhir ? Number(terakhir.code.slice(prefix.length)) || 0 : 0;
  const code = `${prefix}${String(nomorTerakhir + 1).padStart(4, '0')}`;

  const job = await prisma.jobPosting.create({
    data: {
      code,
      title: String(formData.get('title') ?? '').trim(),
      type: String(formData.get('type') ?? 'Guru') as never,
      unitId,
      subject: String(formData.get('subject') ?? '').trim() || null,
      quota: Math.max(1, Number(formData.get('quota') ?? 1)),
      employmentType: String(formData.get('employmentType') ?? '').trim(),
      minEducation: String(formData.get('minEducation') ?? '').trim(),
      description: String(formData.get('description') ?? '').trim(),
      requirements: String(formData.get('requirements') ?? '').trim(),
      benefits: String(formData.get('benefits') ?? '').trim() || null,
      openAt,
      closeAt,
      status: 'Draft',
      createdBy: BigInt(session.userId),
      documents: {
        create: [
          { code: 'SURAT_LAMARAN', label: 'Surat Lamaran', required: true },
          { code: 'CV', label: 'Curriculum Vitae', required: true },
          { code: 'IJAZAH', label: 'Ijazah Terakhir', required: true },
          { code: 'KTP', label: 'KTP', required: true },
          { code: 'FOTO', label: 'Pas Foto 3x4', required: false },
        ],
      },
      stages: {
        create: [
          { order: 1, name: 'Seleksi Berkas', weight: 20 },
          { order: 2, name: 'Tes', weight: 30 },
          { order: 3, name: 'Wawancara', weight: 50 },
        ],
      },
    },
  });

  await recordAudit({ aksi: 'REKRUTMEN_BUAT_LOWONGAN', entitas: 'job_posting', entitasId: String(job.id), ringkasan: `Lowongan ${job.title} (${job.code}) dibuat berstatus Draft.`, aktor: await aktor() });
  revalidatePath('/rekrutmen');
}

/** Ajukan lowongan Draft untuk disetujui (job_manage), lalu ketua/kepala unit menyetujuinya (approve). */
export async function ajukanLowongan(formData: FormData) {
  await requireAction('rekrutmen.job_manage');
  const id = BigInt(String(formData.get('id')));
  const job = await prisma.jobPosting.update({ where: { id }, data: { status: 'PendingApproval' } });
  await recordAudit({ aksi: 'REKRUTMEN_AJUKAN_LOWONGAN', entitas: 'job_posting', entitasId: String(id), ringkasan: `Lowongan ${job.code} diajukan untuk persetujuan.`, aktor: await aktor() });
  revalidatePath('/rekrutmen');
}

export async function setujuiLowongan(formData: FormData) {
  const session = await requireAction('rekrutmen.approve');
  const id = BigInt(String(formData.get('id')));
  const job = await prisma.jobPosting.update({ where: { id }, data: { status: 'Open', approvedBy: BigInt(session.userId), approvedAt: new Date() } });
  await recordAudit({ aksi: 'REKRUTMEN_SETUJUI_LOWONGAN', entitas: 'job_posting', entitasId: String(id), ringkasan: `Lowongan ${job.code} disetujui dan dibuka.`, aktor: await aktor() });
  revalidatePath('/rekrutmen');
}

export async function tutupLowongan(formData: FormData) {
  await requireAction('rekrutmen.approve');
  const id = BigInt(String(formData.get('id')));
  const job = await prisma.jobPosting.update({ where: { id }, data: { status: 'Closed' } });
  await recordAudit({ aksi: 'REKRUTMEN_TUTUP_LOWONGAN', entitas: 'job_posting', entitasId: String(id), ringkasan: `Lowongan ${job.code} ditutup manual.`, aktor: await aktor() });
  revalidatePath('/rekrutmen');
}

/** Tandai satu dokumen lamaran terverifikasi/perlu perbaikan (03 §5.4). */
export async function verifikasiDokumen(formData: FormData) {
  const session = await requireAction('rekrutmen.screen');
  const id = BigInt(String(formData.get('id')));
  const verified = String(formData.get('verified')) === 'true';
  const note = String(formData.get('note') ?? '').trim() || null;
  const doc = await prisma.applicationDocument.update({ where: { id }, data: { verified, verifiedBy: BigInt(session.userId), note } });
  await recordAudit({ aksi: 'REKRUTMEN_VERIFIKASI_BERKAS', entitas: 'application_document', entitasId: String(id), ringkasan: `Berkas ${doc.code} lamaran #${doc.applicationId} ditandai ${verified ? 'terverifikasi' : 'perlu perbaikan'}.`, aktor: await aktor() });
  revalidatePath(`/rekrutmen/pelamar/${doc.applicationId}`);
}

const IZIN_PER_STATUS: Record<ApplicationStatus, string> = {
  Submitted: 'rekrutmen.screen', Screening: 'rekrutmen.screen', Shortlisted: 'rekrutmen.screen',
  Test: 'rekrutmen.screen', Interview: 'rekrutmen.screen',
  Offered: 'rekrutmen.decide', Hired: 'rekrutmen.decide', Rejected: 'rekrutmen.decide',
  Withdrawn: 'rekrutmen.screen', Reserve: 'rekrutmen.decide',
};

/** Ubah status lamaran + catat ApplicationEvent (dipakai timeline cek status publik). */
export async function ubahStatusLamaran(formData: FormData) {
  const id = BigInt(String(formData.get('id')));
  const toStatus = String(formData.get('status')) as ApplicationStatus;
  const izin = IZIN_PER_STATUS[toStatus];
  if (!izin) throw new Error('Status tujuan tidak dikenal.');
  const session = await requireAction(izin);

  const note = String(formData.get('note') ?? '').trim() || null;
  const scheduleRaw = String(formData.get('scheduleAt') ?? '').trim();
  const location = String(formData.get('location') ?? '').trim() || null;

  const lamaran = await prisma.jobApplication.findUniqueOrThrow({ where: { id } });
  await prisma.jobApplication.update({ where: { id }, data: { status: toStatus } });
  await prisma.applicationEvent.create({
    data: {
      applicationId: id,
      fromStatus: lamaran.status,
      toStatus,
      note,
      scheduleAt: scheduleRaw ? new Date(scheduleRaw) : null,
      location,
      actorId: BigInt(session.userId),
    },
  });
  await recordAudit({ aksi: 'REKRUTMEN_UBAH_STATUS_LAMARAN', entitas: 'job_application', entitasId: String(id), ringkasan: `Lamaran ${lamaran.number} diubah dari ${lamaran.status} ke ${toStatus}.`, aktor: await aktor() });
  // WA_TEMPLATE terkait (LMR_UNDANGAN_TES, LMR_HASIL_LOLOS, LMR_HASIL_TDK_LOLOS) dikirim di sini
  // saat integrasi WA gateway tersedia di sandbox ini — selalu lewat WA_DRY_RUN, belum dipicu.
  revalidatePath(`/rekrutmen/pelamar/${id}`);
  revalidatePath('/rekrutmen');
}

/** Nilai satu tahap seleksi oleh satu evaluator (05 §5.1: bisa penilai tamu lewat ApplicationEvaluator). */
export async function beriNilai(formData: FormData) {
  const session = await requireAction('rekrutmen.score');
  const applicationId = BigInt(String(formData.get('applicationId')));
  const stageId = BigInt(String(formData.get('stageId')));
  const score = Number(formData.get('score'));
  const note = String(formData.get('note') ?? '').trim() || null;
  if (!Number.isFinite(score) || score < 0 || score > 100) throw new Error('Nilai harus 0–100.');

  await prisma.applicationScore.upsert({
    where: { applicationId_stageId_evaluatorId: { applicationId, stageId, evaluatorId: BigInt(session.userId) } },
    create: { applicationId, stageId, evaluatorId: BigInt(session.userId), score, note },
    update: { score, note },
  });

  const skorTertimbang = await hitungTotalSkor(applicationId);
  await prisma.jobApplication.update({ where: { id: applicationId }, data: { totalScore: skorTertimbang } });

  await recordAudit({ aksi: 'REKRUTMEN_BERI_NILAI', entitas: 'job_application', entitasId: String(applicationId), ringkasan: `Nilai tahap dicatat untuk lamaran #${applicationId}.`, aktor: await aktor() });
  revalidatePath(`/rekrutmen/pelamar/${applicationId}`);
}

/** Total skor tertimbang = rata-rata skor tiap tahap (dari semua evaluator) dikali bobot tahap, dibagi total bobot. */
async function hitungTotalSkor(applicationId: bigint) {
  const application = await prisma.jobApplication.findUniqueOrThrow({ where: { id: applicationId } });
  const stages = await prisma.jobStage.findMany({ where: { jobId: application.jobId } });
  const scores = await prisma.applicationScore.findMany({ where: { applicationId } });
  let totalBobot = 0;
  let totalTertimbang = 0;
  for (const stage of stages) {
    const nilaiTahap = scores.filter((s) => s.stageId === stage.id);
    if (nilaiTahap.length === 0) continue;
    const rerata = nilaiTahap.reduce((sum, s) => sum + Number(s.score), 0) / nilaiTahap.length;
    totalTertimbang += rerata * stage.weight;
    totalBobot += stage.weight;
  }
  return totalBobot > 0 ? Math.round((totalTertimbang / totalBobot) * 100) / 100 : null;
}

/** Konversi pelamar berstatus Hired jadi pegawai (Person + Staff + User), sandi sementara wajib diganti (03 §6). */
export async function konversiJadiPegawai(formData: FormData) {
  const id = BigInt(String(formData.get('id')));
  await requireAction('rekrutmen.hire');

  const lamaran = await prisma.jobApplication.findUniqueOrThrow({ where: { id }, include: { job: true } });
  if (lamaran.status !== 'Hired') throw new Error('Hanya lamaran berstatus Hired yang bisa dikonversi jadi pegawai.');
  if (lamaran.personId) throw new Error('Lamaran ini sudah dikonversi sebelumnya.');

  const tahun = new Date().getFullYear();
  const jumlahStaff = await prisma.staff.count();
  const employeeNumber = `PEG-${tahun}-${String(jumlahStaff + 1).padStart(4, '0')}`;
  const emailBaru = lamaran.email ?? `${lamaran.nik}@pegawai.nuha.pesantren.web.id`;
  const usernameDasar = lamaran.fullName.toLowerCase().replace(/[^a-z]+/g, '.').replace(/(^\.|\.$)/g, '') || `pegawai${lamaran.id}`;
  let username = usernameDasar;
  let salinan = 1;
  while (await prisma.user.findUnique({ where: { username } })) {
    username = `${usernameDasar}${++salinan}`;
  }
  const passwordSementara = 'Nuha2026!';
  const passwordHash = await bcrypt.hash(passwordSementara, 12);

  const person = await prisma.person.create({
    data: {
      nik: lamaran.nik,
      fullName: lamaran.fullName,
      gender: lamaran.gender,
      birthDate: lamaran.birthDate,
      birthPlace: lamaran.birthPlace,
      addressLine: lamaran.addressLine,
      regionId: lamaran.regionId ?? undefined,
      email: lamaran.email,
      phone: lamaran.phone,
    },
  });
  const staff = await prisma.staff.create({
    data: {
      personId: person.id,
      employeeNumber,
      unitId: lamaran.job.unitId,
      position: lamaran.job.title,
      status: 'Aktif',
      lastEducation: lamaran.lastEducation,
    },
  });
  await prisma.user.create({
    data: { personId: person.id, email: emailBaru, username, passwordHash, mustChangePassword: true, unitScope: null },
  });
  await prisma.userUnit.create({ data: { userId: (await prisma.user.findUniqueOrThrow({ where: { personId: person.id } })).id, unitId: lamaran.job.unitId } }).catch(() => undefined);
  await prisma.jobApplication.update({ where: { id }, data: { personId: person.id } });

  await recordAudit({
    aksi: 'REKRUTMEN_KONVERSI_PEGAWAI',
    entitas: 'job_application',
    entitasId: String(id),
    ringkasan: `Pelamar ${lamaran.fullName} (${lamaran.number}) dikonversi jadi pegawai ${employeeNumber}, akun ${username}.`,
    aktor: await aktor(),
  });
  revalidatePath(`/rekrutmen/pelamar/${id}`);
  void staff;
}
