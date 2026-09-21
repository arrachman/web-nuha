'use server';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { parseRegionId, validateActiveVillage } from '@/lib/wilayah';

/** Tiga berkas yang wajib dilampirkan — persis validasi di prototype. */
const BERKAS_WAJIB = ['Akta Kelahiran', 'Kartu Keluarga', 'Ijazah / SKL'];
const BERKAS_OPSIONAL = ['Foto 3x4 latar merah', 'Surat Keterangan Sehat'];

export type PayloadDaftarPpdb = {
  nama: string;
  nisn: string;
  jk: string;
  tempatLahir: string;
  tglLahir: string;
  alamat: string;
  regionId: string;
  wali: string;
  hp: string;
  asalSekolah: string;
  kabSekolah: string;
  tahunLulus: string;
  nilaiRapor: string;
  pernahMondok: string;
  pickUnit: Record<string, boolean>;
  jurusan: string;
  programPondok: string;
  berkas: Record<string, boolean>;
};

export type HasilDaftarPpdb =
  | { ok: true; noReg: string }
  | { ok: false; errors: Partial<Record<'nama' | 'nisn' | 'tglLahir' | 'wali' | 'hp' | 'asalSekolah' | 'unit' | 'berkas' | 'regionId', string>> };

/** Validasi persis `validateStep` di prototype, dijalankan ulang untuk seluruh langkah sekaligus. */
function validasi(data: PayloadDaftarPpdb): Record<string, string> {
  const e: Record<string, string> = {};

  if (!data.nama.trim()) e.nama = 'Nama lengkap wajib diisi.';
  if (!data.nisn.trim()) e.nisn = 'NISN wajib diisi.';
  else if (!/^[0-9]{10}$/.test(data.nisn.trim())) e.nisn = 'NISN harus 10 digit angka.';
  if (!data.tglLahir.trim()) e.tglLahir = 'Tanggal lahir wajib diisi.';
  if (!data.wali.trim()) e.wali = 'Nama wali wajib diisi.';
  if (!data.hp.trim()) e.hp = 'No. HP wali wajib diisi.';
  else if (!/^08[0-9]{8,11}$/.test(data.hp.trim())) e.hp = 'Format HP tidak valid (08xxxxxxxxxx).';

  if (!data.asalSekolah.trim()) e.asalSekolah = 'Sekolah asal wajib diisi.';

  const unitTerpilih = Object.keys(data.pickUnit).filter((k) => data.pickUnit[k]);
  if (unitTerpilih.length === 0) e.unit = 'Pilih minimal satu unit.';

  const berkasKurang = BERKAS_WAJIB.filter((w) => !data.berkas[w]);
  if (berkasKurang.length) e.berkas = `Berkas wajib belum lengkap: ${berkasKurang.join(', ')}.`;

  return e;
}

/** Susun label pilihan unit, dipakai untuk kolom `pilihan` dan ditampilkan di cek status. */
function susunPilihan(data: PayloadDaftarPpdb): string {
  const bagian: string[] = [];
  if (data.pickUnit.SMP) bagian.push('SMP');
  if (data.pickUnit.MA) bagian.push(data.jurusan && data.jurusan !== '-' ? `MA (${data.jurusan})` : 'MA');
  if (data.pickUnit.Pondok) bagian.push(data.programPondok && data.programPondok !== '-' ? `Pondok (${data.programPondok})` : 'Pondok');
  return bagian.join(' + ') || '-';
}

/**
 * Tulis pendaftaran baru + berkasnya. Nomor registrasi berurutan per tahun
 * (`PPDB-<tahun>-NNNN`) diturunkan dari registrationNumber terakhir di dalam transaksi;
 * kalau ada tabrakan (dua pendaftar submit bersamaan) constraint unik pada
 * `registrationNumber` akan menolak insert dan kita coba lagi dengan angka berikutnya.
 */
export async function daftarPpdb(data: PayloadDaftarPpdb): Promise<HasilDaftarPpdb> {
  const errors = validasi(data);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const regionError = await validateActiveVillage(data.regionId);
  if (regionError) return { ok: false, errors: { regionId: regionError } };
  const regionId = parseRegionId(data.regionId);

  const tahun = new Date().getFullYear();
  const prefix = `PPDB-${tahun}-`;
  const pilihan = susunPilihan(data);

  const berkasBaris = [...BERKAS_WAJIB, ...BERKAS_OPSIONAL]
    .filter((nama) => data.berkas[nama])
    .map((nama) => ({ name: nama, required: BERKAS_WAJIB.includes(nama), verified: false }));

  const MAKS_PERCOBAAN = 5;
  for (let percobaan = 0; percobaan < MAKS_PERCOBAAN; percobaan++) {
    try {
      const registrationNumber = await prisma.$transaction(async (tx) => {
        const terakhir = await tx.applicant.findFirst({
          where: { registrationNumber: { startsWith: prefix } },
          orderBy: { id: 'desc' },
          select: { registrationNumber: true },
        });
        const nomorTerakhir = terakhir ? Number(terakhir.registrationNumber.slice(prefix.length)) || 0 : 0;
        const nomorBaru = String(nomorTerakhir + 1).padStart(4, '0');
        const registrationNumberBaru = `${prefix}${nomorBaru}`;

        await tx.applicant.create({
          data: {
            registrationNumber: registrationNumberBaru,
            fullName: data.nama.trim(),
            gender: data.jk === 'P' ? 'P' : 'L',
            choice: pilihan,
            previousSchool: data.asalSekolah.trim(),
            guardianPhone: data.hp.trim(),
            registeredAt: new Date(),
            status: 'New',
            regionId,
            documents: { create: berkasBaris },
          },
        });

        return registrationNumberBaru;
      });

      return { ok: true, noReg: registrationNumber };
    } catch (err) {
      const konflikUnik = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
      if (!konflikUnik || percobaan === MAKS_PERCOBAAN - 1) throw err;
      // registrationNumber sudah dipakai pendaftar lain yang submit di waktu bersamaan — ulangi dengan nomor berikutnya.
    }
  }

  throw new Error('Gagal membuat nomor registrasi setelah beberapa percobaan.');
}
