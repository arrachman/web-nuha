'use server';

import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { simpanBerkas, BerkasError } from '@/lib/berkas';
import { parseRegionId, validateActiveVillage } from '@/lib/wilayah';

export type ErrorsLamaran = Partial<Record<
  | 'nik' | 'fullName' | 'gender' | 'birthPlace' | 'birthDate' | 'phone' | 'email' | 'addressLine' | 'regionId'
  | 'lastEducation' | 'institution' | 'graduationYear' | 'consent' | 'documents' | 'form',
  string
>>;

export type HasilLamaran = { ok: true; number: string; statusToken: string } | { ok: false; errors: ErrorsLamaran };

/**
 * Terima FormData langsung (bukan JSON) supaya berkas asli ikut terkirim —
 * berbeda dari PPDB yang masih simulasi checkbox unggah (03 §5.3 minta
 * unggah nyata, dikompres di klien sebelum sampai sini).
 */
export async function kirimLamaran(formData: FormData): Promise<HasilLamaran> {
  // Honeypot + jebakan waktu — pertahanan dasar terhadap bot (03 §4 "Perlindungan form publik").
  if (String(formData.get('website') ?? '').trim().length > 0) {
    return { ok: false, errors: { form: 'Pengiriman ditolak.' } };
  }
  const dimulaiPada = Number(formData.get('formOpenedAt') ?? 0);
  if (!dimulaiPada || Date.now() - dimulaiPada < 2500) {
    return { ok: false, errors: { form: 'Formulir dikirim terlalu cepat, silakan coba lagi.' } };
  }

  const jobCode = String(formData.get('jobCode') ?? '').trim();
  const job = await prisma.jobPosting.findFirst({
    where: { code: jobCode, status: 'Open', deletedAt: null },
    include: { documents: true },
  });
  if (!job) return { ok: false, errors: { form: 'Lowongan tidak ditemukan atau sudah ditutup.' } };
  const now = new Date();
  if (now < job.openAt || now > job.closeAt) {
    return { ok: false, errors: { form: 'Lowongan ini sedang tidak menerima lamaran.' } };
  }

  const nik = String(formData.get('nik') ?? '').trim();
  const fullName = String(formData.get('fullName') ?? '').trim();
  const gender = String(formData.get('gender') ?? '') === 'P' ? 'P' : 'L';
  const birthPlace = String(formData.get('birthPlace') ?? '').trim();
  const birthDate = String(formData.get('birthDate') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const addressLine = String(formData.get('addressLine') ?? '').trim();
  const regionIdRaw = String(formData.get('regionId') ?? '');
  const maritalStatus = String(formData.get('maritalStatus') ?? '').trim() || null;
  const lastEducation = String(formData.get('lastEducation') ?? '').trim();
  const major = String(formData.get('major') ?? '').trim() || null;
  const institution = String(formData.get('institution') ?? '').trim();
  const graduationYear = Number(formData.get('graduationYear') ?? 0);
  const gpaRaw = String(formData.get('gpa') ?? '').trim();
  const pesantrenHistory = String(formData.get('pesantrenHistory') ?? '').trim() || null;
  const quranMemorizationRaw = String(formData.get('quranMemorization') ?? '').trim();
  const kitabAbility = String(formData.get('kitabAbility') ?? '').trim() || null;
  const experienceText = String(formData.get('experienceText') ?? '').trim() || null;
  const expectedSalaryRaw = String(formData.get('expectedSalary') ?? '').trim();
  const consent = String(formData.get('consent') ?? '') === 'on';

  const errors: ErrorsLamaran = {};
  if (!/^[0-9]{16}$/.test(nik)) errors.nik = 'NIK harus 16 digit angka.';
  if (!fullName) errors.fullName = 'Nama lengkap wajib diisi.';
  if (!birthPlace) errors.birthPlace = 'Tempat lahir wajib diisi.';
  if (!birthDate) errors.birthDate = 'Tanggal lahir wajib diisi.';
  if (!/^08[0-9]{8,11}$/.test(phone)) errors.phone = 'Format HP tidak valid (08xxxxxxxxxx).';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Format email tidak valid.';
  if (!addressLine) errors.addressLine = 'Alamat wajib diisi.';
  if (!lastEducation) errors.lastEducation = 'Pendidikan terakhir wajib diisi.';
  if (!institution) errors.institution = 'Nama institusi wajib diisi.';
  if (!graduationYear || graduationYear < 1970 || graduationYear > new Date().getFullYear() + 1) {
    errors.graduationYear = 'Tahun lulus tidak valid.';
  }
  if (!consent) errors.consent = 'Persetujuan data wajib dicentang.';

  const regionError = await validateActiveVillage(regionIdRaw);
  if (regionError) errors.regionId = regionError;

  const wajibDokumen = job.documents.filter((d) => d.required);
  const dokumenKurang = wajibDokumen.filter((d) => !(formData.get(`doc_${d.code}`) instanceof File) || (formData.get(`doc_${d.code}`) as File).size === 0);
  if (dokumenKurang.length) {
    errors.documents = `Berkas wajib belum lengkap: ${dokumenKurang.map((d) => d.label).join(', ')}.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const sudahAda = await prisma.jobApplication.findFirst({ where: { jobId: job.id, nik } });
  if (sudahAda) {
    return { ok: false, errors: { nik: 'NIK ini sudah pernah melamar untuk lowongan ini.' } };
  }

  const ip = null; // requestIp() butuh header(); form publik ini cukup dicatat null bila tidak tersedia di test.
  const statusToken = randomBytes(24).toString('hex');
  const prefix = `LMR-${new Date().getFullYear()}-`;

  const MAKS_PERCOBAAN = 5;
  for (let percobaan = 0; percobaan < MAKS_PERCOBAAN; percobaan++) {
    try {
      const number = await prisma.$transaction(async (tx) => {
        const terakhir = await tx.jobApplication.findFirst({
          where: { number: { startsWith: prefix } },
          orderBy: { id: 'desc' },
          select: { number: true },
        });
        const nomorTerakhir = terakhir ? Number(terakhir.number.slice(prefix.length)) || 0 : 0;
        const numberBaru = `${prefix}${String(nomorTerakhir + 1).padStart(4, '0')}`;

        const app = await tx.jobApplication.create({
          data: {
            number: numberBaru,
            jobId: job.id,
            nik,
            fullName,
            gender,
            birthPlace,
            birthDate: new Date(birthDate),
            phone,
            email: email || null,
            addressLine,
            regionId: parseRegionId(regionIdRaw),
            maritalStatus,
            lastEducation,
            major,
            institution,
            graduationYear,
            gpa: gpaRaw ? new Prisma.Decimal(gpaRaw) : null,
            pesantrenHistory,
            quranMemorization: quranMemorizationRaw ? Number(quranMemorizationRaw) : null,
            kitabAbility,
            experienceText,
            expectedSalary: expectedSalaryRaw ? Number(expectedSalaryRaw) : null,
            consentAt: now,
            statusToken,
            submittedIp: ip,
          },
        });

        for (const doc of job.documents) {
          const file = formData.get(`doc_${doc.code}`);
          if (!(file instanceof File) || file.size === 0) continue;
          const buffer = Buffer.from(await file.arrayBuffer());
          const fileObj = await simpanBerkas({ domain: 'rekrutmen', buffer, originalName: file.name, uploadedBy: null });
          await tx.applicationDocument.create({
            data: { applicationId: app.id, code: doc.code, fileId: fileObj.id },
          });
        }

        await tx.applicationEvent.create({
          data: { applicationId: app.id, toStatus: 'Submitted', note: 'Lamaran dikirim melalui formulir publik.' },
        });

        return numberBaru;
      });

      return { ok: true, number, statusToken };
    } catch (err) {
      const konflikUnik = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
      if (err instanceof BerkasError) return { ok: false, errors: { documents: err.message } };
      if (!konflikUnik || percobaan === MAKS_PERCOBAAN - 1) throw err;
    }
  }

  throw new Error('Gagal membuat nomor lamaran setelah beberapa percobaan.');
}
