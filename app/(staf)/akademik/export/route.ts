import { readSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { bacaFilter, whereFilter, type FilterAkademik } from '../filter';

const JENJANG_SEKOLAH = ['SMP', 'MA'] as const;

function baris(nilai: Array<string | number | boolean | null | undefined>): string {
  return nilai
    .map((nilai) => {
      const teks = String(nilai ?? '');
      return /[",\n]/.test(teks) ? `"${teks.replace(/"/g, '""')}"` : teks;
    })
    .join(',');
}

function tanggal(nilai: Date | null): string {
  return nilai ? new Intl.DateTimeFormat('id-ID').format(nilai) : '';
}

function nomorWali(row: { wali: { phone: string | null } }): string {
  return row.wali.phone ?? '';
}

function ambilWali(
  relasi: Array<{
    utama: boolean;
    peran: string | null;
    wali: { fullName: string; nik: string | null; phone: string | null; addressLine: string | null };
    hubungan: string;
    nik: string | null;
    ttl: string | null;
    pekerjaan: string | null;
    pendidikan: string | null;
    pendapatan: string | null;
  }>,
  peran: string,
) {
  return relasi.find((row) => row.peran === peran) ?? relasi.find((row) => row.utama);
}

function dataWali(
  wali: ReturnType<typeof ambilWali>,
): Array<string | null | undefined> {
  if (!wali) return Array(10).fill('');
  return [
    wali.wali.fullName,
    wali.hubungan,
    wali.nik ?? wali.wali.nik,
    wali.ttl,
    wali.pekerjaan,
    wali.pendidikan,
    wali.pendapatan,
    nomorWali(wali),
    wali.wali.addressLine,
    wali.peran,
  ];
}

export async function GET(request: Request) {
  const session = await readSession();
  if (!session) return Response.json({ success: false, data: null, error: { code: 'UNAUTHORIZED', message: 'Perlu masuk.' } }, { status: 401 });

  const granted = await prisma.menuRole.count({ where: { menu: { key: 'akademik' }, role: { key: { in: session.peran } } } });
  if (!granted) return Response.json({ success: false, data: null, error: { code: 'FORBIDDEN', message: 'Tidak berwenang mengakses akademik.' } }, { status: 403 });

  const searchParams = Object.fromEntries(new URL(request.url).searchParams.entries());
  const filter = bacaFilter(searchParams) as FilterAkademik;
  const where = {
    AND: [
      whereFilter(filter),
      { unit: { jenjang: { in: [...JENJANG_SEKOLAH] } } },
    ],
  };
  const siswa = await prisma.santri.findMany({
    where,
    include: {
      person: {
        include: {
          sebagaiAnak: {
            include: { wali: true },
            orderBy: [{ utama: 'desc' }, { peran: 'asc' }],
          },
          region: true,
        },
      },
      unit: true,
      kelas: true,
      room: { include: { dormitory: true } },
    },
    orderBy: { person: { fullName: 'asc' } },
  });

  const header = [
    'NIS', 'NISN', 'Nama', 'NIK', 'Jenis Kelamin', 'Tempat Lahir', 'Tanggal Lahir',
    'Unit', 'Jenjang', 'Kelas', 'Tingkat', 'Program', 'Tahun Masuk', 'Status', 'Asrama', 'Kamar',
    'Alamat', 'RT', 'RW', 'Kelurahan/Desa', 'Kecamatan', 'Kabupaten/Kota', 'Desa ID', 'Wilayah lengkap', 'Kode pos', 'No. KK',
    'Anak Ke', 'Jumlah Saudara', 'Hobi', 'Cita-cita', 'Asal Sekolah', 'Pendidikan Terakhir', 'No. HP', 'Email',
    'Nama Ayah', 'Hubungan Ayah', 'NIK Ayah', 'TTL Ayah', 'Pekerjaan Ayah', 'Pendidikan Ayah', 'Pendapatan Ayah', 'HP Ayah', 'Alamat Ayah', 'Peran Ayah',
    'Nama Ibu', 'Hubungan Ibu', 'NIK Ibu', 'TTL Ibu', 'Pekerjaan Ibu', 'Pendidikan Ibu', 'Pendapatan Ibu', 'HP Ibu', 'Alamat Ibu', 'Peran Ibu',
    'Nama Wali', 'Hubungan Wali', 'NIK Wali', 'TTL Wali', 'Pekerjaan Wali', 'Pendidikan Wali', 'Pendapatan Wali', 'HP Wali', 'Alamat Wali', 'Peran Wali',
  ];
  const csv = [
    baris(header),
    ...siswa.map((santri) => {
      const { person } = santri;
      const ayah = ambilWali(person.sebagaiAnak, 'Ayah');
      const ibu = ambilWali(person.sebagaiAnak, 'Ibu');
      const wali = ambilWali(person.sebagaiAnak, 'Wali');
      return baris([
        santri.nis, santri.nisn, person.fullName, person.nik, person.gender, person.birthPlace, tanggal(person.birthDate),
        santri.unit?.nama, santri.unit?.jenjang, santri.kelas?.nama, santri.kelas?.tingkat, santri.program, santri.tahunMasuk, santri.status,
        santri.room?.dormitory.name, santri.room?.code,
        person.addressLine, person.neighborhoodRt, person.neighborhoodRw, person.villageName, person.districtName, person.regencyName,
        person.regionId ? String(person.regionId) : null, person.region?.fullName, person.postalCode ?? person.region?.postalCode, person.familyCardNumber,
        person.birthOrder, person.siblingCount, person.hobby, person.aspiration, person.previousSchool, person.highestEducation, person.phone, person.email,
        ...dataWali(ayah), ...dataWali(ibu), ...dataWali(wali),
      ]);
    }),
  ].join('\r\n');

  return new Response(`﻿${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="data-siswa-smp-ma.csv"',
    },
  });
}
