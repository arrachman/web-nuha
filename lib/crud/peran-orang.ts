import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import type { Field } from './types';

/**
 * Satu baris `person` adalah identitas dasar; perannya (santri, guru, staf,
 * wali) hidup di tabel lain. Operator dulu harus membuat orang lebih dahulu
 * lalu membuka modul Santri/Kepegawaian dan menyalin ID-nya. Field virtual di
 * bawah memindahkan langkah itu ke dalam form: pilih peran sekali, barisnya
 * dibuatkan di sini setelah identitas tersimpan.
 */
export const PERAN_ORANG = ['santri', 'guru', 'staf', 'wali', 'belum'] as const;
export type PeranOrang = (typeof PERAN_ORANG)[number];

const LABEL_PERAN: Record<PeranOrang, string> = {
  santri: 'Santri',
  guru: 'Guru',
  staf: 'Staf',
  wali: 'Wali murid',
  belum: 'Belum ditentukan',
};

const HUBUNGAN_WALI = ['Ayah', 'Ibu', 'Wali'];

const tampilBila = (sama: PeranOrang[]) => ({ field: 'peranOrang', sama: [...sama] as string[] });

/** Field virtual: tidak ada kolomnya di tabel `person`. */
export const FIELD_PERAN: Field[] = [
  {
    name: 'peranOrang',
    label: 'Daftarkan sebagai',
    type: 'pilihan-banyak',
    virtual: true,
    span: 3,
    group: 'Peran',
    // "belum" bukan pilihan lagi: tanpa centang apa pun artinya belum berperan.
    options: PERAN_ORANG.filter((peran) => peran !== 'belum'),
    optionLabels: LABEL_PERAN,
    hint: 'Boleh lebih dari satu — mis. guru yang juga wali santri.',
  },
  {
    name: 'peranNis',
    label: 'NIS',
    type: 'text',
    virtual: true,
    group: 'Peran',
    tampilBila: tampilBila(['santri']),
    hint: 'Kosongkan bila belum ada.',
    placeholder: '2026001',
  },
  {
    name: 'peranNip',
    label: 'NIP',
    type: 'text',
    virtual: true,
    group: 'Peran',
    tampilBila: tampilBila(['guru', 'staf']),
    hint: 'Kosongkan untuk dibuatkan otomatis.',
    placeholder: '198701012010011001',
  },
  {
    name: 'peranJabatan',
    label: 'Jabatan',
    type: 'text',
    virtual: true,
    group: 'Peran',
    tampilBila: tampilBila(['guru', 'staf']),
    placeholder: 'Guru Mapel / Tata Usaha',
    hint: 'Menentukan kategori: yang memuat kata "Guru" terbaca sebagai guru.',
  },
  {
    // Jabatan struktural (SK) sengaja terpisah dari `peranJabatan`: kategori
    // orang disimpulkan dari `jabatan`, jadi menaruh "Waka Kurikulum" di sana
    // akan membuat guru terbaca staf. Lihat FILTER_KATEGORI_ORANG di bawah.
    name: 'peranTugasTambahan',
    label: 'Tugas tambahan / jabatan struktural',
    type: 'text',
    virtual: true,
    span: 3,
    group: 'Peran',
    tampilBila: tampilBila(['guru', 'staf']),
    placeholder: 'Waka Kurikulum / Wali Kelas 10',
    hint: 'Opsional. Jabatan dari SK, bukan penentu hak akses menu.',
  },
  {
    name: 'peranWali',
    label: 'Wali santri ini',
    type: 'orang-banyak',
    virtual: true,
    span: 3,
    group: 'Peran',
    hubungan: HUBUNGAN_WALI,
    tampilBila: tampilBila(['santri']),
    placeholder: 'Klik untuk melihat daftar, atau ketik nama…',
    hint: 'Boleh lebih dari satu; yang pertama jadi wali utama.',
  },
  {
    name: 'peranAnak',
    label: 'Santri yang diwalikan',
    type: 'orang-banyak',
    virtual: true,
    span: 3,
    group: 'Peran',
    hubungan: HUBUNGAN_WALI,
    hanyaSantri: true,
    tampilBila: tampilBila(['wali']),
    placeholder: 'Klik untuk melihat daftar santri…',
    hint: 'Boleh lebih dari satu santri.',
  },
];

/**
 * Peran orang tidak disimpan sebagai kolom — ia disimpulkan dari relasi
 * (baris `santri`, `pegawai`, atau relasi wali). Jadi filternya berupa field
 * virtual dengan peta nilai → klausa `where` Prisma. "Guru" adalah himpunan
 * bagian dari "Pegawai" (dibedakan lewat kata "Guru" di `jabatan`), sesuai
 * badge peran di tabel yang menyebut semua baris `pegawai` sebagai Pegawai.
 */
export const FILTER_KATEGORI_ORANG: Field = {
  name: 'kategoriOrang',
  label: 'Peran',
  type: 'select',
  virtual: true,
  hanyaFilter: true,
  options: ['santri', 'guru', 'pegawai', 'wali', 'belum'],
  optionLabels: { santri: 'Santri', guru: 'Guru', pegawai: 'Pegawai', wali: 'Wali', belum: 'Tanpa peran' },
  filterWhere: {
    santri: { santri: { isNot: null } },
    guru: { staff: { is: { position: { contains: 'Guru' } } } },
    pegawai: { staff: { isNot: null } },
    wali: { waliDari: { some: {} } },
    // Orang yang belum terhubung ke modul mana pun — biasanya sisa impor
    // identitas yang perannya belum ditetapkan.
    belum: { santri: { is: null }, staff: { is: null }, waliDari: { none: {} } },
  },
};

const teks = (input: Record<string, unknown>, key: string) => String(input[key] ?? '').trim();

/**
 * Peran dikirim sebagai daftar dipisah koma. Nilai asing dibuang, dan `belum`
 * diperlakukan sebagai "tidak ada peran" supaya data lama tetap terbaca.
 */
function bacaPeran(input: Record<string, unknown>): Set<PeranOrang> {
  const dipilih = new Set<PeranOrang>();
  for (const bagian of teks(input, 'peranOrang').split(',')) {
    const nilai = bagian.trim() as PeranOrang;
    if (nilai && nilai !== 'belum' && PERAN_ORANG.includes(nilai)) dipilih.add(nilai);
  }
  return dipilih;
}

/**
 * Guru dan staf berbagi satu baris `pegawai` (relasi 1-1 ke orang), jadi bila
 * keduanya dicentang, guru yang menang — jabatannya yang menentukan kategori.
 */
const peranPegawaiDari = (dipilih: Set<PeranOrang>): 'guru' | 'staf' | null =>
  (dipilih.has('guru') ? 'guru' : dipilih.has('staf') ? 'staf' : null);

const jabatanDari = (input: Record<string, unknown>, peran: 'guru' | 'staf') =>
  teks(input, 'peranJabatan') || (peran === 'guru' ? 'Guru Mapel' : 'Staf');

/** NIP wajib & unik di skema, jadi sediakan cadangan yang deterministik. */
const nipCadangan = (personId: string) => `NIP-${personId.padStart(6, '0')}`;

async function catat(personId: string, ringkasan: string, perubahan: Record<string, unknown>, aktor: { id: string; nama: string }, aksi: 'CRUD_CREATE' | 'CRUD_UPDATE' | 'CRUD_DELETE' = 'CRUD_CREATE') {
  await recordAudit({ aksi, entitas: 'orang_peran', entitasId: personId, ringkasan, perubahan, aktor });
}

type Relasi = { id: string; hubungan: string };

/** Pemilih banyak orang mengirim JSON; tolak apa pun yang bukan daftar id sah. */
function bacaRelasi(input: Record<string, unknown>, key: string): Relasi[] {
  const mentah = teks(input, key);
  if (!mentah) return [];
  let terurai: unknown;
  try {
    terurai = JSON.parse(mentah);
  } catch {
    return [];
  }
  if (!Array.isArray(terurai)) return [];
  const hasil: Relasi[] = [];
  const sudah = new Set<string>();
  for (const item of terurai) {
    if (!item || typeof item !== 'object') continue;
    const { id, hubungan } = item as Record<string, unknown>;
    const idTeks = String(id ?? '').trim();
    if (!/^\d+$/.test(idTeks) || sudah.has(idTeks)) continue;
    sudah.add(idTeks);
    hasil.push({ id: idTeks, hubungan: HUBUNGAN_WALI.includes(String(hubungan)) ? String(hubungan) : 'Wali' });
  }
  return hasil;
}

/**
 * Sambungkan pasangan wali↔anak. Relasi ini banyak-ke-banyak dan unik per
 * (wali, anak), jadi pasangan yang sudah ada di-update alih-alih ditolak.
 * Wali utama hanya satu per anak — yang sudah ada tidak diturunkan diam-diam.
 */
async function sambungkanWali(waliId: bigint, anakId: bigint, hubungan: string): Promise<boolean> {
  if (waliId === anakId) return false;
  const [adaWali, adaAnak] = await Promise.all([
    prisma.person.count({ where: { id: waliId } }),
    prisma.person.count({ where: { id: anakId } }),
  ]);
  if (!adaWali || !adaAnak) return false;
  const sudahAdaUtama = await prisma.guardianRelation.count({ where: { anakId, utama: true } });
  await prisma.guardianRelation.upsert({
    where: { waliId_anakId: { waliId, anakId } },
    create: { waliId, anakId, hubungan, peran: hubungan, utama: sudahAdaUtama === 0 },
    update: { hubungan, peran: hubungan },
  });
  return true;
}

/**
 * Buat baris peran untuk orang yang baru disimpan. Idempoten: bila orang itu
 * sudah punya baris santri/pegawai, biarkan yang lama (relasi 1-1 `personId`).
 */
export async function daftarkanPeran(personId: string, input: Record<string, unknown>, aktor: { id: string; nama: string }): Promise<void> {
  const dipilih = bacaPeran(input);
  const id = BigInt(personId);

  if (dipilih.has('santri')) {
    if (!(await prisma.santri.count({ where: { personId: id } }))) {
      const nis = teks(input, 'peranNis') || null;
      await prisma.santri.create({ data: { personId: id, nis, status: 'Aktif' } });
      await catat(personId, `Mendaftarkan sebagai santri${nis ? ` (NIS ${nis})` : ''}`, { peran: 'santri', nis }, aktor);
    }
    // Santri boleh punya beberapa wali (ayah, ibu, wali lain).
    for (const wali of bacaRelasi(input, 'peranWali')) {
      if (await sambungkanWali(BigInt(wali.id), id, wali.hubungan)) {
        await catat(personId, `Menetapkan orang #${wali.id} sebagai ${wali.hubungan}`, { waliId: wali.id, hubungan: wali.hubungan }, aktor);
      }
    }
  }

  const peranPegawai = peranPegawaiDari(dipilih);
  if (peranPegawai && !(await prisma.staff.count({ where: { personId: id } }))) {
    const nip = teks(input, 'peranNip') || nipCadangan(personId);
    const jabatan = jabatanDari(input, peranPegawai);
    const tugasTambahan = teks(input, 'peranTugasTambahan') || null;
    await prisma.staff.create({ data: { personId: id, employeeNumber: nip, position: jabatan, additionalDuties: tugasTambahan, status: 'Aktif' } });
    await catat(personId, `Mendaftarkan sebagai ${LABEL_PERAN[peranPegawai].toLowerCase()} (NIP ${nip})`, { peran: peranPegawai, nip, jabatan, tugasTambahan }, aktor);
  }

  // Wali tanpa santri yang dipilih tetap sah — identitasnya sudah tersimpan
  // dan relasinya bisa dibuat nanti di panel Wali santri. Satu wali boleh
  // mewakili beberapa santri sekaligus.
  if (dipilih.has('wali')) {
    for (const anak of bacaRelasi(input, 'peranAnak')) {
      if (await sambungkanWali(id, BigInt(anak.id), anak.hubungan)) {
        await catat(personId, `Mendaftarkan sebagai ${anak.hubungan} dari orang #${anak.id}`, { peran: 'wali', anakId: anak.id, hubungan: anak.hubungan }, aktor);
      }
    }
  }
}

/** Relasi yang dicabut operator ikut hilang; yang tersisa disesuaikan hubungannya. */
async function selaraskanRelasi(
  personId: string,
  arah: 'wali' | 'anak',
  daftar: Relasi[],
  id: bigint,
  aktor: { id: string; nama: string },
): Promise<void> {
  const kunci = arah === 'wali' ? { anakId: id } : { waliId: id };
  const lama = await prisma.guardianRelation.findMany({ where: kunci, select: { waliId: true, anakId: true } });
  const tetap = new Set(daftar.map((item) => item.id));
  for (const baris of lama) {
    const lawan = String(arah === 'wali' ? baris.waliId : baris.anakId);
    if (tetap.has(lawan)) continue;
    await prisma.guardianRelation.delete({ where: { waliId_anakId: { waliId: baris.waliId, anakId: baris.anakId } } });
    await catat(personId, `Mencabut relasi wali dengan orang #${lawan}`, { arah, lawan }, aktor, 'CRUD_DELETE');
  }
  for (const item of daftar) {
    const [waliId, anakId] = arah === 'wali' ? [BigInt(item.id), id] : [id, BigInt(item.id)];
    if (await sambungkanWali(waliId, anakId, item.hubungan)) {
      await catat(personId, `Menetapkan relasi ${item.hubungan} dengan orang #${item.id}`, { arah, lawan: item.id, hubungan: item.hubungan }, aktor, 'CRUD_UPDATE');
    }
  }
}

/**
 * Selaraskan peran setelah identitas diubah. Baris santri/pegawai yang sudah
 * ada diperbarui, bukan digandakan; dan peran yang tidak lagi dipilih **tidak**
 * dihapus diam-diam — modul lain (nilai, presensi, gaji) masih merujuknya, jadi
 * pencabutannya dilakukan sengaja lewat modul asalnya. Relasi wali, yang tidak
 * dirujuk modul lain, memang ikut dicabut sesuai isi daftar.
 */
export async function selaraskanPeran(personId: string, input: Record<string, unknown>, aktor: { id: string; nama: string }): Promise<void> {
  if (!('peranOrang' in input)) return;
  const dipilih = bacaPeran(input);
  const id = BigInt(personId);

  if (dipilih.has('santri')) {
    const nis = teks(input, 'peranNis') || null;
    const ada = await prisma.santri.count({ where: { personId: id } });
    if (ada) {
      await prisma.santri.update({ where: { personId: id }, data: { nis } });
      await catat(personId, `Memperbarui data santri${nis ? ` (NIS ${nis})` : ''}`, { nis }, aktor, 'CRUD_UPDATE');
    } else {
      await prisma.santri.create({ data: { personId: id, nis, status: 'Aktif' } });
      await catat(personId, `Mendaftarkan sebagai santri${nis ? ` (NIS ${nis})` : ''}`, { peran: 'santri', nis }, aktor);
    }
    if ('peranWali' in input) await selaraskanRelasi(personId, 'wali', bacaRelasi(input, 'peranWali'), id, aktor);
  }

  const peranPegawai = peranPegawaiDari(dipilih);
  if (peranPegawai) {
    const jabatan = jabatanDari(input, peranPegawai);
    const ada = await prisma.staff.findUnique({ where: { personId: id }, select: { employeeNumber: true } });
    const nip = teks(input, 'peranNip') || ada?.employeeNumber || nipCadangan(personId);
    const tugasTambahan = teks(input, 'peranTugasTambahan') || null;
    if (ada) {
      await prisma.staff.update({ where: { personId: id }, data: { employeeNumber: nip, position: jabatan, additionalDuties: tugasTambahan } });
      await catat(personId, `Memperbarui data pegawai (NIP ${nip})`, { nip, jabatan, tugasTambahan }, aktor, 'CRUD_UPDATE');
    } else {
      await prisma.staff.create({ data: { personId: id, employeeNumber: nip, position: jabatan, additionalDuties: tugasTambahan, status: 'Aktif' } });
      await catat(personId, `Mendaftarkan sebagai ${LABEL_PERAN[peranPegawai].toLowerCase()} (NIP ${nip})`, { peran: peranPegawai, nip, jabatan, tugasTambahan }, aktor);
    }
  }

  if (dipilih.has('wali') && 'peranAnak' in input) {
    await selaraskanRelasi(personId, 'anak', bacaRelasi(input, 'peranAnak'), id, aktor);
  }
  // Peran yang tidak lagi dicentang tidak dihapus di sini — lihat catatan atas.
}
