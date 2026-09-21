import { PrismaClient, JenisKelamin, ApplicantStatus, StatusSantri } from '@prisma/client';
import bcrypt from 'bcryptjs';
import data from './proto-data.json';
import { seedCbt } from './seed-cbt';
import { seedAcademicYear as seedAcademicYearRows } from './tahun-ajaran';

const prisma = new PrismaClient();
type PrototypeData = Record<string, Array<Record<string, unknown>>>;
const source = data as PrototypeData;

const BULAN: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, Mei: 4, Jun: 5, Jul: 6, Agu: 7, Sep: 8, Okt: 9, Nov: 10, Des: 11 };

/**
 * Prototype menulis tanggal dalam dua bentuk: "22 Agu 2026" dan "24 Agu" (tanpa
 * tahun, mis. pada agenda). Tanpa cabang kedua semua agenda jatuh ke tanggal
 * cadangan yang sama sehingga tabelnya hanya berisi satu baris.
 */
const parseDate = (value: unknown, tahunDefault = 2026): Date => {
  const text = String(value ?? '22 Agu 2026').replace(/–/g, '-');
  const lengkap = text.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)\s+(\d{4})/);
  if (lengkap) return new Date(Date.UTC(Number(lengkap[3]), BULAN[lengkap[2]], Number(lengkap[1])));
  const singkat = text.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)/);
  if (singkat) return new Date(Date.UTC(tahunDefault, BULAN[singkat[2]], Number(singkat[1])));
  return new Date('2026-08-22T00:00:00Z');
};

/**
 * Kolom `agenda.time` hanya VarChar(16), sedangkan prototype menulis
 * "09.00 · Aula Utama". Ambil segmen jamnya saja lalu potong seaman kolom.
 */
const jamSingkat = (value: unknown): string => String(value ?? '').split('·')[0].trim().slice(0, 16);

/** Slug peran dari nama jabatan: "Musyrif Asrama" → "musyrif-asrama". */
const kunciPeran = (nama: string): string =>
  nama.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32);

/** Peran tanpa grant menu apa pun — akses ditambahkan manual lewat Pengaturan. */
const perolehPeran = (nama: string) => {
  const key = kunciPeran(nama);
  return prisma.role.upsert({ where: { key }, create: { key, name: nama }, update: { name: nama } });
};

/** Prototype hanya memuat jadwal satu rombongan belajar. */
const KELAS_JADWAL_PROTOTYPE = '8B';

/**
 * Menggantikan period hardcode di app/kurikulum/kelas-guru.ts. Idempoten:
 * dipanggil berkali-kali dari fungsi seed berbeda; daftar 2024/2025 s.d.
 * tahun pelajaran berjalan (Gasal + Genap) ada di prisma/tahun-ajaran.ts.
 */
const seedTahunAjaran = () => seedAcademicYearRows(prisma);

const gender = (value: unknown): JenisKelamin => String(value) === 'P' ? JenisKelamin.P : JenisKelamin.L;
const pendaftarStatus = (value: unknown): ApplicantStatus => {
  const statuses: Record<string, ApplicantStatus> = { Baru: 'New', Verifikasi: 'Verification', Seleksi: 'Selection', Lulus: 'Passed', 'Tidak Lulus': 'Failed', 'Daftar Ulang': 'Reenrollment' };
  return statuses[String(value)] ?? 'New';
};

async function seedAcademicContent() {
  const mapelByName = new Map<string, { id: number }>();
  for (const [index, row] of source.strukturKurikulum.entries()) {
    const mapel = await prisma.mataPelajaran.upsert({
      where: { kode: `MAP-${String(index + 1).padStart(3, '0')}` },
      create: { kode: `MAP-${String(index + 1).padStart(3, '0')}`, nama: String(row.mapel), jp: Number(row.jp), kelompok: String(row.kelompok), guru: String(row.guru), kkm: Number(row.kkm), kurikulum: String(row.kur) },
      update: { nama: String(row.mapel), jp: Number(row.jp), kelompok: String(row.kelompok), guru: String(row.guru), kkm: Number(row.kkm), kurikulum: String(row.kur) },
    });
    mapelByName.set(mapel.nama, mapel);
  }
  for (const row of source.perangkatAjar) await prisma.perangkatAjar.upsert({ where: { kode: String(row.id) }, create: { kode: String(row.id), mapel: String(row.mapel), kelas: String(row.kelas), jenis: String(row.jenis), topik: String(row.topik), pertemuan: Number(row.pertemuan), guru: String(row.guru), status: String(row.status) }, update: { status: String(row.status) } });
  for (const row of source.capaianPembelajaran) {
    const mapel = mapelByName.get(String(row.mapel));
    await prisma.capaianPembelajaran.upsert({ where: { kode: String(row.kode) }, create: { kode: String(row.kode), mapelId: mapel?.id, mapel: String(row.mapel), fase: String(row.fase), capaian: String(row.capaian) }, update: { capaian: String(row.capaian) } });
  }
  for (const row of source.bankSoal) await prisma.bankSoal.upsert({ where: { kode: String(row.kode) }, create: { kode: String(row.kode), mapel: String(row.mapel), topik: String(row.topik), tipe: String(row.tipe), level: String(row.level), butir: Number(row.butir), dipakai: Number(row.dipakai), penulis: String(row.penulis) }, update: { butir: Number(row.butir), dipakai: Number(row.dipakai) } });
  // Kolom keempat prototype adalah *ruangan*, dan seluruh jadwal itu milik satu
  // rombongan belajar (8B). Menyalinnya ke `kelas` membuat "Lab IPA"/"Musholla"
  // muncul sebagai kelas dan memutus guru dari kelas yang sebenarnya diampu.
  const RUANG_BUKAN_KELAS = /^(lab|musholla|masjid|aula|lapangan|workshop|perpustakaan)/i;
  for (const day of source.jadwalPelajaran) for (const [index, row] of (day.rows as unknown[][]).entries()) {
    const tempat = String(row[3]);
    const ruangSaja = RUANG_BUKAN_KELAS.test(tempat);
    const kelas = ruangSaja ? KELAS_JADWAL_PROTOTYPE : tempat;
    const ruang = ruangSaja ? tempat : 'Ruang kelas';
    await prisma.jadwalPelajaran.upsert({
      where: { hari_jamKe_kelas: { hari: String(day.hari), jamKe: index + 1, kelas } },
      create: { hari: String(day.hari), jamKe: index + 1, waktu: String(row[0]), mapel: String(row[1]), guru: String(row[2]), kelas, ruang },
      update: { waktu: String(row[0]), mapel: String(row[1]), guru: String(row[2]), ruang },
    });
  }
  for (const row of source.lmsKursus) await prisma.kursusLms.upsert({ where: { kode: String(row.kode) }, create: { kode: String(row.kode), nama: String(row.nama), guru: String(row.guru), modul: Number(row.modul), selesai: Number(row.selesai), tugasAktif: Number(row.tugasAktif), nilai: Number(row.nilai) }, update: { modul: Number(row.modul), selesai: Number(row.selesai), tugasAktif: Number(row.tugasAktif), nilai: Number(row.nilai) } });
  const courses = await prisma.kursusLms.findMany(); const courseByName = new Map(courses.map((course) => [course.nama, course]));
  // MateriLms has no natural key, so guard the append rather than upsert it.
  if (await prisma.materiLms.count() === 0) {
    for (const row of source.lmsMateri) { const course = courseByName.get(String(row.kursus)); if (course) await prisma.materiLms.create({ data: { kursusId: course.id, judul: String(row.judul), tipe: String(row.tipe), status: String(row.status), tgl: parseDate(row.tgl) } }); }
  }
  for (const row of source.lmsTugas) { const course = courseByName.get(String(row.kursus)); if (course) await prisma.tugasLms.upsert({ where: { kode: String(row.kode) }, create: { kode: String(row.kode), kursusId: course.id, judul: String(row.judul), deadline: parseDate(row.deadline), status: String(row.status) }, update: { status: String(row.status) } }); }
}

/**
 * Portal identities are ordinary `User` rows with a username, so santri and wali
 * reuse the same session, role, and menu machinery as staff. Runs before the
 * first-boot guard so an already-seeded database still gains the portals.
 */
/**
 * Super admin memegang seluruh menu dan boleh menyamar sebagai peran lain untuk
 * debugging. Sandinya diambil dari SUPERADMIN_PASSWORD bila diset, sehingga
 * deployment nyata tidak terpaku pada sandi seed bersama.
 */
async function seedSuperAdmin(passwordHashBawaan: string) {
  const sandi = process.env.SUPERADMIN_PASSWORD;
  const passwordHash = sandi ? await bcrypt.hash(sandi, 12) : passwordHashBawaan;
  const peran = await prisma.role.upsert({
    where: { key: 'superadmin' },
    create: { key: 'superadmin', name: 'Super Admin' },
    update: { name: 'Super Admin' },
  });

  const orang = await prisma.person.upsert({
    where: { email: 'superadmin@nuha.pesantren.web.id' },
    create: { fullName: 'Super Admin', gender: JenisKelamin.L, email: 'superadmin@nuha.pesantren.web.id', isActive: true },
    update: { isActive: true },
  });
  const user = await prisma.user.upsert({
    where: { personId: orang.id },
    create: { personId: orang.id, email: orang.email!, username: 'superadmin', passwordHash, unitScope: 'Semua unit', aktif: true },
    update: { username: 'superadmin', passwordHash, aktif: true },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: peran.id } },
    create: { userId: user.id, roleId: peran.id },
    update: {},
  });

  // Semua menu diberikan agar super admin bisa membuka layar mana pun tanpa
  // harus menyamar lebih dulu.
  for (const menu of await prisma.menuItem.findMany()) {
    await prisma.menuRole.upsert({
      where: { menuId_roleId: { menuId: menu.id, roleId: peran.id } },
      create: { menuId: menu.id, roleId: peran.id },
      update: {},
    });
  }
}

/**
 * Peran `guru` sebelumnya tidak dipegang siapa pun, sehingga tab "Kelas Saya"
 * tak pernah bisa dibuka. Yang menentukan isi tab itu adalah kecocokan persis
 * `JadwalPelajaran.guru` dengan nama pengguna — jadi akun dibuat dari daftar
 * pengajar di jadwal, bukan dari tabel pegawai (namanya tidak selalu sama).
 */
async function seedGuru(passwordHash: string) {
  const peran = await prisma.role.upsert({
    where: { key: 'guru' },
    create: { key: 'guru', name: 'Guru / Wali Kelas' },
    update: {},
  });

  const jadwal = await prisma.jadwalPelajaran.findMany({ distinct: ['guru'], select: { guru: true } });
  const namaGuru = jadwal.map((row) => (row.guru ?? '').trim()).filter(Boolean).sort();

  for (const [index, nama] of namaGuru.entries()) {
    // Nama pengajar bisa sama dengan pegawai yang sudah punya akun lain (mis.
    // Pengasuh yang juga mengajar). Pakai email khusus guru agar akunnya
    // terpisah dan peran aslinya tidak tertimpa.
    const email = `guru.${kunciPeran(nama)}@nuha.local`;
    const orang = await prisma.person.upsert({
      where: { email },
      create: { fullName: nama, gender: nama.startsWith('Bu ') ? JenisKelamin.P : JenisKelamin.L, email, isActive: true },
      update: { fullName: nama, isActive: true },
    });
    const user = await prisma.user.upsert({
      where: { personId: orang.id },
      create: { personId: orang.id, email, username: `guru.${index + 1}`, passwordHash, unitScope: 'Unit mengajar', aktif: true },
      update: { username: `guru.${index + 1}`, passwordHash, aktif: true },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: peran.id } },
      create: { userId: user.id, roleId: peran.id },
      update: {},
    });
  }

  // `kelas.wali_kelas` seluruhnya NULL, jadi badge "Wali Kelas" tak pernah
  // muncul. Tunjuk satu wali per kelas dari pengajar kelas itu sendiri.
  const kelasRows = await prisma.kelas.findMany({ where: { waliKelas: null }, select: { id: true, nama: true } });
  for (const kelas of kelasRows) {
    const pengampu = await prisma.jadwalPelajaran.findFirst({ where: { kelas: kelas.nama }, select: { guru: true } });
    if (pengampu?.guru) await prisma.kelas.update({ where: { id: kelas.id }, data: { waliKelas: pengampu.guru } });
  }
}

/**
 * Prototype hanya memuat jadwal satu rombongan belajar SMP, sehingga tiap guru
 * seolah mengajar di satu kelas saja. Kenyataannya seorang guru lazim mengampu
 * di SMP dan MA sekaligus, bahkan merangkap ustadz di pondok. Jadwal tambahan
 * dibuat di sini — deterministik dari daftar guru, bukan acak — supaya kartu
 * "Kelas Saya" bisa diuji lintas unit.
 */
async function seedJadwalLintasUnit() {
  const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Sabtu'];
  const [mapelSemua, unitSemua] = await Promise.all([
    prisma.mataPelajaran.findMany({ orderBy: { kode: 'asc' } }),
    prisma.unit.findMany(),
  ]);
  const pondok = unitSemua.find((unit) => unit.key === 'Pondok');
  // Diniyah pondok berjenjang I'dad (kelas persiapan bagi santri yang belum
  // lancar baca kitab/Al-Qur'an) lalu kelas 1–6, satu rombel per tingkat, jadi
  // guru yang merangkap ustadz punya tempat mengajar di tiap jenjangnya.
  // I'dad memakai tingkat '0' supaya urut paling depan.
  if (pondok) {
    const academicYearAktif = await seedTahunAjaran();
    const jenjang: { nama: string; tingkat: string }[] = [
      { nama: "Kelas I'dad", tingkat: '0' },
      ...Array.from({ length: 6 }, (_, i) => ({ nama: `Kelas ${i + 1}`, tingkat: String(i + 1) })),
    ];
    for (const { nama, tingkat } of jenjang) {
      await prisma.kelas.upsert({
        where: { unitId_nama_academicYearId: { unitId: pondok.id, nama, academicYearId: academicYearAktif.id } },
        create: { unitId: pondok.id, nama, tingkat, academicYearId: academicYearAktif.id },
        update: { tingkat },
      });
    }
  }
  // Diambil setelah kelas diniyah dipastikan ada.
  const kelasSemua = await prisma.kelas.findMany({ include: { unit: true }, orderBy: { nama: 'asc' } });
  const kelasMa = kelasSemua.filter((kelas) => kelas.unit.nama.startsWith('MA'));
  // Kelas SMP selain rombel prototype, supaya guru tidak hanya terikat ke 8B.
  const kelasSmpLain = kelasSemua.filter(
    (kelas) => kelas.unit.nama.startsWith('SMP') && kelas.nama !== KELAS_JADWAL_PROTOTYPE,
  );
  if (kelasMa.length === 0 || mapelSemua.length === 0) return;

  const guruRows = await prisma.jadwalPelajaran.findMany({
    where: { kelas: KELAS_JADWAL_PROTOTYPE },
    distinct: ['guru'],
    select: { guru: true, mapel: true },
    orderBy: { guru: 'asc' },
  });

  let jamKe = 7;
  for (const [index, row] of guruRows.entries()) {
    const guru = (row.guru ?? '').trim();
    if (!guru) continue;
    const mapel = mapelSemua.find((m) => m.nama === row.mapel) ?? mapelSemua[index % mapelSemua.length];

    // Satu jam di MA dan satu lagi di kelas SMP lain: itu sudah cukup untuk
    // membuat pengampuan guru benar-benar lintas unit dan lintas rombel.
    const target = [kelasMa[index % kelasMa.length]];
    if (kelasSmpLain.length > 0) target.push(kelasSmpLain[index % kelasSmpLain.length]);

    for (const kelas of target) {
      const hari = HARI[(index + target.indexOf(kelas)) % HARI.length];
      await prisma.jadwalPelajaran.upsert({
        where: { hari_jamKe_kelas: { hari, jamKe, kelas: kelas.nama } },
        create: {
          hari, jamKe, waktu: '13.00–14.20', mapel: mapel.nama, guru,
          kelas: kelas.nama, ruang: 'Ruang kelas', unitId: kelas.unitId,
        },
        update: { mapel: mapel.nama, guru, unitId: kelas.unitId },
      });
    }

    // Sepertiga pengajar merangkap ustadz diniyah di pondok.
    if (pondok && index % 3 === 0) {
      const kelasDiniyah = kelasSemua.find((kelas) => kelas.unitId === pondok.id);
      if (kelasDiniyah) {
        // Kunci uniknya (hari, jamKe, kelas); tanpa jam yang berbeda per ustadz
        // seluruh baris diniyah saling menimpa dan hanya satu yang tersisa.
        const jamDiniyah = 20 + index;
        await prisma.jadwalPelajaran.upsert({
          where: { hari_jamKe_kelas: { hari: 'Jumat', jamKe: jamDiniyah, kelas: kelasDiniyah.nama } },
          create: {
            hari: 'Jumat', jamKe: jamDiniyah, waktu: '16.00–17.00', mapel: 'Diniyah',
            guru, kelas: kelasDiniyah.nama, ruang: 'Musholla', unitId: pondok.id,
          },
          update: { guru, unitId: pondok.id },
        });
      }
    }
    jamKe = jamKe === 9 ? 7 : jamKe + 1;
  }
}

/**
 * Satu gelombang ujian per unit sekolah, dengan sesi untuk tiap kelas dan
 * beberapa mapel. Nilai hanya diisi untuk gelombang yang sudah selesai — yang
 * masih berjalan sengaja dibiarkan kosong supaya layar "belum dinilai" ikut teruji.
 */
async function seedUjian() {
  const unitSekolah = await prisma.unit.findMany({ where: { OR: [{ nama: { startsWith: 'SMP' } }, { nama: { startsWith: 'MA' } }] } });
  // Hanya mapel yang benar-benar diajarkan pada jadwal pelajaran. Tanpa filter
  // ini, sesi ujian bisa jatuh ke mapel sisa data uji yang tak punya pengampu,
  // sehingga tak seorang guru pun melihat kartu ujiannya.
  const mapelDiajarkan = await prisma.jadwalPelajaran.findMany({
    where: { guru: { not: null } }, distinct: ['mapel'], select: { mapel: true },
  });
  const mapelSemua = await prisma.mataPelajaran.findMany({
    where: { nama: { in: mapelDiajarkan.map((j) => j.mapel) } },
    orderBy: { kode: 'asc' },
  });
  if (mapelSemua.length === 0) return;

  // Sesi dari seed sebelumnya yang mapelnya di luar daftar ini tidak akan pernah
  // terlihat oleh guru mana pun; buang agar rekap kemajuan tidak menghitungnya.
  await prisma.jadwalUjian.deleteMany({ where: { mapelId: { notIn: mapelSemua.map((m) => m.id) } } });

  for (const unit of unitSekolah) {
    const kelasUnit = await prisma.kelas.findMany({ where: { unitId: unit.id }, orderBy: { nama: 'asc' }, take: 4 });
    if (kelasUnit.length === 0) continue;
    const singkat = unit.nama.startsWith('SMP') ? 'SMP' : 'MA';

    for (const gelombang of [
      { type: 'UTS', nama: 'Ujian Tengah Semester Gasal', mulai: '2026-09-21', selesai: '2026-09-26', status: 'Selesai' },
      { type: 'UAS', nama: 'Ujian Akhir Semester Gasal', mulai: '2026-12-07', selesai: '2026-12-12', status: 'Berjalan' },
    ]) {
      const kode = `UJI-${singkat}-${gelombang.type}-2026G`;
      const ujian = await prisma.ujian.upsert({
        where: { kode },
        create: {
          kode, nama: `${gelombang.nama} — ${singkat}`, jenis: gelombang.type, unitId: unit.id,
          tahunAjaran: '2026/2027', semester: 'Gasal',
          mulai: new Date(gelombang.mulai), selesai: new Date(gelombang.selesai), status: gelombang.status,
        },
        update: { status: gelombang.status },
      });

      for (const [iKelas, kelas] of kelasUnit.entries()) {
        for (const [iMapel, mapel] of mapelSemua.entries()) {
          const hari = new Date(gelombang.mulai);
          hari.setUTCDate(hari.getUTCDate() + iMapel);
          const jadwal = await prisma.jadwalUjian.upsert({
            where: { ujianId_mapelId_kelasId: { ujianId: ujian.id, mapelId: mapel.id, kelasId: kelas.id } },
            create: {
              ujianId: ujian.id, mapelId: mapel.id, kelasId: kelas.id, tgl: hari,
              waktu: iKelas % 2 === 0 ? '07.30–09.00' : '09.30–11.00', durasi: 90,
              ruang: `Ruang ${kelas.nama}`, pengawas: kelas.waliKelas,
            },
            update: { tgl: hari, pengawas: kelas.waliKelas },
          });

          if (gelombang.status !== 'Selesai') continue;
          const peserta = await prisma.santri.findMany({ where: { kelasId: kelas.id }, select: { id: true } });
          for (const [iSantri, santri] of peserta.entries()) {
            // Nilai contoh yang stabil antar-seed: turunan indeks, bukan acak,
            // supaya rekap tidak berubah tiap kali seed dijalankan ulang.
            const nilai = 70 + ((iSantri * 7 + iMapel * 3 + iKelas) % 26);
            await prisma.nilaiUjian.upsert({
              where: { jadwalId_santriId: { jadwalId: jadwal.id, santriId: santri.id } },
              create: { jadwalId: jadwal.id, santriId: santri.id, nilai, hadir: true },
              update: { nilai },
            });
          }
        }
      }
    }
  }
}

async function seedPortalAccess() {
  const passwordHash = await bcrypt.hash('Nuha2026!', 12);
  const roleSantri = await prisma.role.upsert({ where: { key: 'santri' }, create: { key: 'santri', name: 'Santri' }, update: {} });
  const roleWali = await prisma.role.upsert({ where: { key: 'wali' }, create: { key: 'wali', name: 'Wali Santri' }, update: {} });

  const roleKetua = await prisma.role.upsert({ where: { key: 'ketua' }, create: { key: 'ketua', name: 'Ketua' }, update: {} });
  const menus = [
    { key: 'portal-santri', label: 'Portal Santri', order: 90, roleId: roleSantri.id },
    { key: 'portal-wali', label: 'Portal Wali', order: 91, roleId: roleWali.id },
    { key: 'data', label: 'Master Data', order: 92, roleId: roleKetua.id },
  ];
  for (const row of menus) {
    const menu = await prisma.menuItem.upsert({ where: { key: row.key }, create: { key: row.key, label: row.label, order: row.order }, update: { label: row.label } });
    await prisma.menuRole.upsert({ where: { menuId_roleId: { menuId: menu.id, roleId: row.roleId } }, create: { menuId: menu.id, roleId: row.roleId }, update: {} });
  }

  // Ujian dipegang bersama: kepala unit menyusun gelombangnya, guru mengisi
  // nilai sesi yang diampu. Ikon mengikuti gaya path menu lain di seed prototype.
  const menuUjian = await prisma.menuItem.upsert({
    where: { key: 'ujian' },
    create: { key: 'ujian', label: 'Ujian', icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11', order: 8 },
    update: { label: 'Ujian' },
  });
  for (const key of ['ketua', 'kepsmp', 'kepma', 'guru']) {
    const peran = await prisma.role.findUnique({ where: { key } });
    if (peran) {
      await prisma.menuRole.upsert({
        where: { menuId_roleId: { menuId: menuUjian.id, roleId: peran.id } },
        create: { menuId: menuUjian.id, roleId: peran.id },
        update: {},
      });
    }
  }

  // Staff share the Master Data entry; each entity is still gated by its own menu grant.
  const dataMenu = await prisma.menuItem.findUnique({ where: { key: 'data' } });
  const staffRoles = await prisma.role.findMany({ where: { key: { notIn: ['santri', 'wali'] } } });
  if (dataMenu) for (const role of staffRoles) {
    await prisma.menuRole.upsert({ where: { menuId_roleId: { menuId: dataMenu.id, roleId: role.id } }, create: { menuId: dataMenu.id, roleId: role.id }, update: {} });
  }

  await seedSuperAdmin(passwordHash);
  // Urutan penting: jadwal lintas unit dulu, baru akun guru dibuat dari
  // daftar pengajar yang sudah lengkap.
  await seedJadwalLintasUnit();
  await seedGuru(passwordHash);
  await seedUjian();

  const santriRows = await prisma.santri.findMany({ include: { person: true } });
  for (const santri of santriRows) {
    const user = await prisma.user.upsert({
      where: { personId: santri.personId },
      create: { personId: santri.personId, email: santri.person.email ?? `santri.${santri.nis}@nuha.local`, username: `santri.${santri.nis}`, passwordHash },
      update: { username: `santri.${santri.nis}` },
    });
    await prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: roleSantri.id } }, create: { userId: user.id, roleId: roleSantri.id }, update: {} });
  }

  // Data client menandai ayah DAN ibu sebagai kontak utama (lihat
  // `import/lib/tulis-wali.ts`) — itu benar, keduanya memang dihubungi. Tapi
  // akun portal wali berusername `wali.<nis>`, satu per santri, jadi harus
  // dipilih satu pemegang akun. Dipilih `waliId` terkecil supaya deterministik
  // dan idempoten; wali lain tetap ada sebagai relasi, hanya tanpa akun login.
  const waliRows = await prisma.guardianRelation.findMany({
    where: { utama: true },
    include: { wali: true, anak: { include: { santri: true } } },
    orderBy: { waliId: 'asc' },
  });
  const sudahPunyaAkun = new Set<string>();
  for (const relasi of waliRows) {
    const nis = relasi.anak.santri?.nis;
    if (!nis) continue;
    if (sudahPunyaAkun.has(nis)) continue;
    sudahPunyaAkun.add(nis);
    const user = await prisma.user.upsert({
      where: { personId: relasi.waliId },
      create: { personId: relasi.waliId, email: relasi.wali.email ?? `wali.${nis}@nuha.local`, username: `wali.${nis}`, passwordHash },
      update: { username: `wali.${nis}` },
    });
    await prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: roleWali.id } }, create: { userId: user.id, roleId: roleWali.id }, update: {} });
  }
}

/**
 * Presensi, nilai, agenda, dan berkas pendaftar tidak pernah terisi oleh importir
 * lama: agenda karena bug format tanggal, sisanya karena memang tidak ada di
 * blok awal. Diisi terpisah dan idempoten supaya aman dijalankan berulang di
 * basis data yang sudah berisi pengguna.
 */
/**
 * Fase 7 — job penjadwal notifikasi WA. `kodeTemplate` di sini adalah code
 * JOB (lihat komentar model `JadwalNotifikasi` di schema.prisma), bukan
 * selalu sama dengan `TemplateWa.code` — WA-GUR-04 punya dua job (H-1, H-0)
 * yang sama-sama mengirim template WA-GUR-04. Dipanggil dari
 * `seedOperational()` (bukan hanya jalur seed awal) supaya database yang
 * sudah berisi pengguna tetap dapat job barunya saat migrasi berjalan.
 */
async function seedPenjadwalNotifikasi() {
  const jobPenjadwal: { kodeTemplate: string; cron: string }[] = [
    { kodeTemplate: 'WA-GUR-04-H1', cron: '0 19 * * *' }, // H-1: tiap hari 19.00 WIB, untuk piket besok
    { kodeTemplate: 'WA-GUR-04-H0', cron: '* * * * *' }, // H-0: dicek tiap menit, cocok saat 45 menit sebelum shift
    { kodeTemplate: 'WA-GUR-05', cron: '30 6 * * *' }, // rekap ngajar: tiap hari 06.30 WIB
  ];
  for (const job of jobPenjadwal) {
    await prisma.notificationSchedule.upsert({
      where: { templateCode: job.kodeTemplate },
      create: { templateCode: job.kodeTemplate, cron: job.cron, isActive: true },
      update: { cron: job.cron },
    });
  }
}

async function seedOperational() {
  const santriList = await prisma.santri.findMany({ orderBy: { id: 'asc' } });
  const mapelList = await prisma.mataPelajaran.findMany({ orderBy: { id: 'asc' } });

  for (const row of source.waCases) {
    await prisma.waTemplate.upsert({
      where: { code: String(row.kode) },
      create: { code: String(row.kode), role: String(row.role), title: String(row.judul), trigger: String(row.pemicu), schedule: String(row.waktu), content: String(row.isi), isActive: Boolean(row.aktif) },
      update: { isActive: Boolean(row.aktif) },
    });
  }
  await seedPenjadwalNotifikasi();

  if (await prisma.attendance.count() === 0) {
    const statuses = ['Present', 'Sick', 'Excused', 'Absent'] as const;
    for (const [i, santri] of santriList.entries()) {
      for (const row of source.presensiAkademik) {
        const tgl = parseDate(row.tgl);
        // Variasi antar santri diambil dari pola prototype, digeser per santri
        // agar rekap kelas tidak seragam sempurna.
        const dasar = statuses.indexOf(String(row.status) as (typeof statuses)[number]);
        const status = statuses[(Math.max(dasar, 0) + (i % 3 === 0 ? 0 : i % 4)) % statuses.length];
        await prisma.attendance.upsert({
          where: { studentId_date_session: { studentId: santri.id, date: tgl, session: 'KBM' } },
          create: { studentId: santri.id, date: tgl, session: 'KBM', status, note: String(row.ket ?? '-') },
          update: {},
        }).catch(() => undefined);
      }
    }
  }

  if (await prisma.nilai.count() === 0) {
    const predikat = (n: number) => n >= 90 ? 'A' : n >= 85 ? 'A-' : n >= 80 ? 'B+' : n >= 75 ? 'B' : n >= 70 ? 'B-' : 'C';
    for (const [i, santri] of santriList.entries()) {
      for (const row of source.nilaiRows) {
        const mapel = mapelList.find((m) => m.nama === String(row.mapel));
        if (!mapel) continue;
        const geser = (i % 5) - 2;
        const tugas = Number(row.tugas) + geser;
        const uts = Number(row.uts) + geser;
        const uas = Number(row.uas) + geser;
        const akhir = Math.round(((tugas + uts + uas) / 3) * 10) / 10;
        await prisma.nilai.upsert({
          where: { santriId_mapelId_periode: { santriId: santri.id, mapelId: mapel.id, periode: '2026/2027 Gasal' } },
          create: { santriId: santri.id, mapelId: mapel.id, periode: '2026/2027 Gasal', tugas, uts, uas, akhir, predikat: predikat(akhir) },
          update: {},
        }).catch(() => undefined);
      }
    }
  }

  if (await prisma.agenda.count() <= 1) {
    await prisma.agenda.deleteMany({});
    for (const row of source.agenda) {
      await prisma.agenda.create({ data: { date: parseDate(row.tgl), time: jamSingkat(row.jam), title: String(row.judul), unit: String(row.unit) } });
    }
  }

  if (await prisma.testimoni.count() === 0) {
    for (const row of [
      { nama: 'Muhammad Fikri', inisial: 'MF', ket: 'Alumni MA 2016 · dokter umum RS Malang', kata: 'Disiplin subuh di pondok itu yang membuat saya bertahan di kepaniteraan klinik.' },
      { nama: 'Nur Azizah', inisial: 'NA', ket: 'Alumni SMP 2014 · guru MI di Bondowoso', kata: 'Hafalan 15 juz saya dimulai dari halaqah kecil di serambi Asrama Khadijah.' },
      { nama: 'Ahmad Hidayat', inisial: 'AH', ket: 'Alumni Pondok 2011 · pengusaha kopi', kata: 'Ngaji kitab mengajari saya membaca akad dagang dengan hati-hati.' },
    ]) await prisma.testimoni.create({ data: row });
  }

  if (await prisma.applicantDocument.count() === 0) {
    const required = ['Akta Kelahiran', 'Kartu Keluarga', 'Ijazah / SKL'];
    const opsional = ['Kartu Indonesia Pintar', 'Surat Keterangan Sehat'];
    for (const p of await prisma.applicant.findMany({ orderBy: { id: 'asc' } })) {
      const lengkap = p.status !== 'New';
      for (const nama of required) {
        await prisma.applicantDocument.create({ data: { applicantId: p.id, name: nama, required: true, verified: lengkap } }).catch(() => undefined);
      }
      if (lengkap) {
        for (const nama of opsional.slice(0, Number(p.id) % 2 + 1)) {
          await prisma.applicantDocument.create({ data: { applicantId: p.id, name: nama, required: false, verified: true } }).catch(() => undefined);
        }
      }
    }
  }
}

async function main() {
  await seedAcademicContent();
  // This is an initial demo-data importer, not a synchronization process. Once
  // users exist, preserve operational data entered through the application.
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    await seedPortalAccess();
    await seedOperational();
    await seedCbt(prisma);
    console.log('Seed skipped: database already contains users; portal access and operational data synchronized.');
    return;
  }

  const passwordHash = await bcrypt.hash('Nuha2026!', 12);
  const academicYearAktif = await seedTahunAjaran();

  const roles = await Promise.all(source.roles.map((row) => prisma.role.upsert({
    where: { key: String(row.key) },
    create: { key: String(row.key), name: String(row.nama) },
    update: { name: String(row.nama) },
  })));
  const roleByKey = new Map(roles.map((role) => [role.key, role]));

  const unitRows = [
    { key: 'SMP', nama: 'SMP', deskripsi: 'Kelas 7–9, Kurikulum Merdeka, 12 rombel.' },
    { key: 'MA', nama: 'MA', deskripsi: 'Kelas 10–12, IPA / IPS / Keagamaan.' },
    { key: 'Pondok', nama: 'Madin', deskripsi: 'Program Tahfidz dan Kitab Kuning.' },
    { key: 'Poskestren', nama: 'Poskestren', deskripsi: 'Layanan kesehatan santri.' },
  ];
  const units = await Promise.all(unitRows.map((row) => prisma.unit.upsert({ where: { key: row.key }, create: row, update: row })));
  const unitByKey = new Map(units.map((unit) => [unit.key, unit]));

  const asramaByName = new Map<string, { id: number }>();
  for (const row of source.asrama) {
    const asrama = await prisma.dormitory.upsert({
      where: { name: String(row.nama) },
      create: { name: String(row.nama), gender: gender(row.jk), capacity: Number(row.kapasitas), supervisor: String(row.musyrif) },
      update: { capacity: Number(row.kapasitas), supervisor: String(row.musyrif) },
    });
    asramaByName.set(asrama.name, asrama);
    for (const kamar of (row.kamarList as unknown[][]) ?? []) {
      await prisma.room.upsert({
        where: { dormitoryId_code: { dormitoryId: asrama.id, code: String(kamar[0]) } },
        create: { dormitoryId: asrama.id, code: String(kamar[0]), capacity: Number(kamar[1]) },
        update: { capacity: Number(kamar[1]) },
      });
    }
  }

  const santriByName = new Map<string, { id: bigint }>();
  for (const row of source.santri) {
    const unit = unitByKey.get(String(row.unit));
    const kelas = unit ? await prisma.kelas.upsert({
      where: { unitId_nama_academicYearId: { unitId: unit.id, nama: String(row.kelas), academicYearId: academicYearAktif.id } },
      create: { unitId: unit.id, nama: String(row.kelas), tingkat: String(row.kelas).replace(/[^0-9X]/g, '') || '-', academicYearId: academicYearAktif.id },
      update: {},
    }) : null;
    const asrama = asramaByName.get(String(row.asrama));
    const kamar = asrama ? await prisma.room.findUnique({ where: { dormitoryId_code: { dormitoryId: asrama.id, code: String(row.kamar) } } }) : null;
    const orang = await prisma.person.upsert({
      where: { email: `santri.${String(row.nis)}@nuha.local` },
      create: { fullName: String(row.nama), gender: gender(row.jk), email: `santri.${String(row.nis)}@nuha.local`, addressLine: String(row.alamat), phone: String(row.hpWali) },
      update: { fullName: String(row.nama), addressLine: String(row.alamat), phone: String(row.hpWali) },
    });
    const santri = await prisma.santri.upsert({
      where: { personId: orang.id },
      create: { personId: orang.id, nis: String(row.nis), nisn: String(row.nisn), unitId: unit?.id, kelasId: kelas?.id, roomId: kamar?.id, status: StatusSantri.Aktif, program: String(row.program), tahunMasuk: String(row.masuk) },
      update: { unitId: unit?.id, kelasId: kelas?.id, roomId: kamar?.id, program: String(row.program) },
    });
    santriByName.set(String(row.nama), santri);
    const wali = await prisma.person.upsert({
      where: { email: `wali.${String(row.nis)}@nuha.local` },
      create: { fullName: String(row.wali), gender: JenisKelamin.L, phone: String(row.hpWali), email: `wali.${String(row.nis)}@nuha.local` },
      update: { phone: String(row.hpWali) },
    });
    await prisma.guardianRelation.upsert({ where: { waliId_anakId: { waliId: wali.id, anakId: orang.id } }, create: { waliId: wali.id, anakId: orang.id, hubungan: 'Orang Tua', pekerjaan: String(row.pekerjaan) }, update: {} });
  }

  for (const row of source.users) {
    // Jabatan yang belum punya peran (Musyrif, Tata Usaha) dibuatkan peran
    // sendiri tanpa grant menu. Sebelumnya jatuh ke `ketua`, sehingga staf biasa
    // otomatis memperoleh hak akses tertinggi.
    const role = roles.find((item) => item.name === row.peran || String(row.peran).startsWith(item.name))
      ?? await perolehPeran(String(row.peran));
    const orang = await prisma.person.upsert({ where: { email: String(row.email) }, create: { fullName: String(row.nama), gender: JenisKelamin.L, email: String(row.email), isActive: Boolean(row.aktif) }, update: { fullName: String(row.nama), isActive: Boolean(row.aktif) } });
    const user = await prisma.user.upsert({ where: { personId: orang.id }, create: { personId: orang.id, email: String(row.email), passwordHash, unitScope: String(row.unit), aktif: Boolean(row.aktif) }, update: { passwordHash, aktif: Boolean(row.aktif) } });
    await prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: role.id } }, create: { userId: user.id, roleId: role.id }, update: {} });
  }

  for (const [index, row] of source.menuDefs.entries()) {
    const menu = await prisma.menuItem.upsert({ where: { key: String(row.key) }, create: { key: String(row.key), label: String(row.label), icon: String(row.icon ?? ''), order: index }, update: { label: String(row.label), icon: String(row.icon ?? ''), order: index } });
    for (const key of (row.roles as string[]) ?? []) {
      const role = roleByKey.get(key);
      if (role) await prisma.menuRole.upsert({ where: { menuId_roleId: { menuId: menu.id, roleId: role.id } }, create: { menuId: menu.id, roleId: role.id }, update: {} });
    }
  }

  for (const row of source.pegawai) {
    const unit = unitByKey.get(String(row.unit));
    const orang = await prisma.person.upsert({ where: { email: `pegawai.${String(row.nip)}@nuha.local` }, create: { fullName: String(row.nama), gender: JenisKelamin.L, email: `pegawai.${String(row.nip)}@nuha.local` }, update: { fullName: String(row.nama) } });
    const pegawai = await prisma.staff.upsert({ where: { personId: orang.id }, create: { personId: orang.id, employeeNumber: String(row.nip), unitId: unit?.id, position: String(row.jabatan), status: String(row.status), bankAccount: String(row.rek) }, update: { position: String(row.jabatan), status: String(row.status), bankAccount: String(row.rek) } });
    await prisma.salaryComponent.upsert({ where: { staffId: pegawai.id }, create: { staffId: pegawai.id, baseSalary: Number(row.baseSalary), positionAllowance: Number(row.positionAllowance), familyAllowance: Number(row.familyAllowance), teachingHours: Number(row.jam), hourlyRate: Number(row.hourlyRate), transport: Number(row.transport), bpjs: Number(row.bpjs), cooperative: Number(row.cooperative), incomeTax: Number(row.incomeTax) }, update: {} });
  }

  for (const row of source.pendaftar) await prisma.applicant.upsert({ where: { registrationNumber: String(row.noReg) }, create: { registrationNumber: String(row.noReg), fullName: String(row.nama), choice: String(row.pilihan), previousSchool: String(row.asal), registeredAt: parseDate(row.date), score: Number(row.nilai), status: pendaftarStatus(row.status) }, update: { status: pendaftarStatus(row.status), score: Number(row.nilai) } });
  for (const row of source.obat) await prisma.medicine.upsert({ where: { name: String(row.nama) }, create: { name: String(row.nama), unit: String(row.satuan), category: String(row.kategori), stock: Number(row.stok), minStock: Number(row.min), expiry: String(row.exp) }, update: { stock: Number(row.stok) } });
  for (const [index, row] of source.kegiatanHarian.entries()) await prisma.dailyActivity.upsert({ where: { id: index + 1 }, create: { id: index + 1, time: String(row.jam), name: String(row.nama), note: String(row.ket), order: index }, update: { name: String(row.nama) } });
  for (const row of source.halaqah) await prisma.studyCircle.create({ data: { name: String(row.nama), teacher: String(row.ustadz), schedule: String(row.waktu), location: String(row.tempat), educationLevel: String(row.jenjang), memberCount: Number(row.anggota) } }).catch(() => undefined);
  for (const row of source.pengumumanSantri) await prisma.announcement.create({ data: { date: parseDate(row.tgl), title: String(row.judul), content: String(row.isi), target: 'Santri' } }).catch(() => undefined);
  for (const row of source.agenda) await prisma.agenda.create({ data: { date: parseDate(row.tgl), time: jamSingkat(row.jam), title: String(row.judul), unit: String(row.unit) } }).catch(() => undefined);
  for (const row of source.waCases) await prisma.waTemplate.upsert({ where: { code: String(row.kode) }, create: { code: String(row.kode), role: String(row.role), title: String(row.judul), trigger: String(row.pemicu), schedule: String(row.waktu), content: String(row.isi), isActive: Boolean(row.aktif) }, update: { isActive: Boolean(row.aktif) } });
  await seedPenjadwalNotifikasi();

  // Transactional records — only for santri that resolved by name.
  const findSantri = (value: unknown) => santriByName.get(String(value));

  for (const row of source.setoran) {
    const santri = findSantri(row.santri);
    if (santri) await prisma.memorization.create({ data: { studentId: santri.id, date: parseDate(row.tgl), chapter: String(row.surat), verses: String(row.ayat), type: String(row.jenis), score: String(row.nilai), examiner: String(row.penguji) } });
  }
  for (const row of source.tazir) {
    const santri = findSantri(row.santri);
    if (santri) await prisma.discipline.create({ data: { studentId: santri.id, date: parseDate(row.tgl), violation: String(row.pelanggaran), points: Number(row.poin), sanction: String(row.sanksi), officer: String(row.petugas) } });
  }
  for (const row of source.izinList) {
    const santri = findSantri(row.santri);
    if (santri) await prisma.leavePermit.upsert({ where: { code: String(row.kode) }, create: { code: String(row.kode), studentId: santri.id, type: String(row.alasan).split('—')[0].trim(), reason: String(row.alasan), pickupBy: String(row.penjemput), departedAt: parseDate(row.keluar), returnedAt: parseDate(row.kembali), status: ({ Menunggu: 'Pending', Disetujui: 'Approved', Ditolak: 'Rejected', Selesai: 'Completed' } as Record<string, 'Pending' | 'Approved' | 'Rejected' | 'Completed'>)[String(row.status)] ?? 'Pending' }, update: {} });
  }
  for (const row of source.kunjungan) {
    const santri = findSantri(row.santri);
    if (santri) await prisma.medicalRecord.create({ data: { studentId: santri.id, date: parseDate(row.tgl), time: String(row.jam), complaint: String(row.keluhan), diagnosis: String(row.diagnosis), treatment: String(row.terapi), followUp: String(row.lanjut), officer: String(row.petugas) } });
  }
  for (const row of source.kunjunganWali) {
    const santri = findSantri(row.santri);
    if (santri) await prisma.kunjungan.create({ data: { santriId: santri.id, namaWali: String(row.wali ?? row.penjenguk ?? 'Wali'), hubungan: String(row.hubungan ?? ''), tgl: parseDate(row.tgl), jamMasuk: String(row.jam ?? row.masuk ?? ''), keperluan: String(row.keperluan ?? ''), status: String(row.status ?? 'Terjadwal') } });
  }
  for (const row of source.tagihanRows) {
    const santri = findSantri(row.santri);
    if (!santri) continue;
    const invoices = await prisma.invoice.upsert({ where: { code: String(row.id) }, create: { code: String(row.id), santriId: santri.id, type: String(row.type), period: String(row.period), amount: Number(row.amount), paidAmount: Number(row.bayar), dueDate: parseDate(row.jatuh) }, update: { paidAmount: Number(row.bayar) } });
    if (Number(row.bayar) > 0) await prisma.payment.create({ data: { invoiceId: invoices.id, date: parseDate(row.jatuh), amount: Number(row.bayar), method: 'Transfer BSI' } }).catch(() => undefined);
  }
  for (const row of source.transaksi) {
    await prisma.cashTransaction.upsert({ where: { code: String(row.code) }, create: { code: String(row.code), date: parseDate(row.date), description: String(row.description), category: String(row.category), method: String(row.method), direction: Number(row.amount) >= 0 ? 'Inbound' : 'Outbound', amount: Math.abs(Number(row.amount)) }, update: {} });
  }

  // Run again now that santri and wali rows exist on a fresh database.
  await seedPortalAccess();
  await seedOperational();
  await seedCbt(prisma);

  console.log('Seed complete: 20 santri, 12 pegawai, 18 pendaftar, and operational master data.');
  console.log('Demo login: ketua@nuha.pesantren.web.id / Nuha2026!');
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
