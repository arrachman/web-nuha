import type { Entity, Field } from './types';
import { FIELD_ORANG_DASAR } from './orang-fields';
import { daftarkanPeran, selaraskanPeran, type PeranOrang } from './peran-orang';

/**
 * Entitas persona: pintasan CRUD satu-layar untuk tiap jenis orang (santri,
 * guru, staf, wali). Semuanya menulis ke tabel `orang` yang sama seperti
 * "Identitas orang" — bedanya perannya sudah dikunci, jadi operator tidak perlu
 * memilih peran, dan daftarnya hanya berisi orang dengan peran itu.
 *
 * Konsekuensinya: menambah lewat sini = membuat identitas **dan** baris
 * peran (santri/pegawai/relasi wali) sekaligus; menghapus = menghapus identitas
 * orangnya (baris peran ikut terhapus lewat `onDelete: Cascade`).
 */

const text = (name: string, label: string, required = true) => ({ name, label, type: 'text' as const, required });

/** Field peran dipakai tanpa `tampilBila`: di persona, perannya sudah pasti. */
const peranNis: Field = { ...text('peranNis', 'NIS', false), virtual: true, group: 'Data santri', hint: 'Kosongkan bila belum ada.', placeholder: '2026001' };
const peranNip = (label: string): Field => ({ ...text('peranNip', 'NIP', false), virtual: true, group: label, hint: 'Kosongkan untuk dibuatkan otomatis.', placeholder: '198701012010011001' });
const peranJabatan = (group: string, placeholder: string): Field => ({ ...text('peranJabatan', 'Jabatan', false), virtual: true, group, placeholder, hint: 'Menentukan kategori: yang memuat kata "Guru" terbaca sebagai guru.' });
const peranTugas = (group: string): Field => ({ ...text('peranTugasTambahan', 'Tugas tambahan / jabatan struktural', false), virtual: true, span: 3, group, placeholder: 'Waka Kurikulum / Wali Kelas 10', hint: 'Opsional. Jabatan dari SK, bukan penentu hak akses menu.' });

const HUBUNGAN_WALI = ['Ayah', 'Ibu', 'Wali'];

const peranWali: Field = {
  name: 'peranWali', label: 'Wali santri ini', type: 'orang-banyak', virtual: true, span: 3, group: 'Data santri',
  hubungan: HUBUNGAN_WALI, placeholder: 'Klik untuk melihat daftar, atau ketik nama…',
  hint: 'Boleh lebih dari satu; yang pertama jadi wali utama.',
};

/**
 * Wajib di persona Wali — status "wali" hanya ada sebagai relasi ke santri, jadi
 * wali tanpa santri tidak akan pernah muncul lagi di daftarnya sendiri.
 */
const peranAnak: Field = {
  name: 'peranAnak', label: 'Santri yang diwalikan', type: 'orang-banyak', virtual: true, span: 3, group: 'Data perwalian',
  hubungan: HUBUNGAN_WALI, hanyaSantri: true, required: true, placeholder: 'Klik untuk melihat daftar santri…',
  hint: 'Wajib minimal satu santri — status wali disimpan sebagai relasi ke santrinya.',
};

/**
 * Peran tidak diminta ke operator, jadi disuntikkan ke input sebelum hook peran
 * berjalan — bentuknya sama dengan yang dikirim kotak centang di form Identitas.
 */
const denganPeran = (peran: PeranOrang, hook: typeof daftarkanPeran) =>
  (id: string, input: Record<string, unknown>, aktor: { id: string; nama: string }) =>
    hook(id, { ...input, peranOrang: peran }, aktor);

const kolom = (...items: Array<[string, string]>) => items.map(([name, label]) => ({ name, label }));

type Resep = {
  key: string;
  label: string;
  peran: PeranOrang;
  deskripsi: string;
  /** Menyaring daftar ke orang yang memang berperan ini. */
  whereDasar: Record<string, unknown>;
  fieldPeran: Field[];
  kolomPeran: Array<[string, string]>;
};

const RESEP: Resep[] = [
  {
    key: 'santri-orang',
    label: 'Santri',
    peran: 'santri',
    deskripsi: 'Tambah, ubah, atau hapus santri lengkap dengan identitas dan walinya dalam satu form. Baris santri dibuat otomatis — tidak perlu membuka menu Identitas orang lebih dulu.',
    whereDasar: { santri: { isNot: null } },
    fieldPeran: [peranNis, peranWali],
    kolomPeran: [['peranNis', 'NIS']],
  },
  {
    key: 'guru-orang',
    label: 'Guru',
    peran: 'guru',
    deskripsi: 'Guru adalah pegawai yang jabatannya memuat kata "Guru". Form ini membuat identitas dan baris kepegawaiannya sekaligus.',
    whereDasar: { staff: { is: { position: { contains: 'Guru' } } } },
    fieldPeran: [peranNip('Data kepegawaian'), peranJabatan('Data kepegawaian', 'Guru Mapel'), peranTugas('Data kepegawaian')],
    kolomPeran: [['peranNip', 'NIP'], ['peranJabatan', 'Jabatan']],
  },
  {
    key: 'staf-orang',
    label: 'Staf',
    peran: 'staf',
    deskripsi: 'Pegawai non-guru: tata usaha, bendahara, keamanan, dapur, dan sejenisnya. Jabatan yang memuat kata "Guru" akan pindah ke daftar Guru.',
    whereDasar: { staff: { is: { NOT: { position: { contains: 'Guru' } } } } },
    fieldPeran: [peranNip('Data kepegawaian'), peranJabatan('Data kepegawaian', 'Tata Usaha'), peranTugas('Data kepegawaian')],
    kolomPeran: [['peranNip', 'NIP'], ['peranJabatan', 'Jabatan']],
  },
  {
    key: 'wali-orang',
    label: 'Wali santri',
    peran: 'wali',
    deskripsi: 'Orang tua atau wali yang bertanggung jawab atas satu atau lebih santri. Pilih santrinya di bawah — relasinya langsung terbentuk.',
    whereDasar: { waliDari: { some: {} } },
    fieldPeran: [peranAnak],
    kolomPeran: [],
  },
];

/** Ringkasan untuk kartu pintasan di halaman /data. */
export const PERSONA = RESEP.map((resep) => ({
  key: resep.key,
  label: resep.label,
  ringkas: resep.deskripsi.split('. ')[0] + '.',
}));

export const ENTITAS_PERSONA: Entity[] = RESEP.map((resep) => ({
  key: resep.key,
  menu: 'induk',
  model: 'person',
  label: resep.label,
  deskripsi: resep.deskripsi,
  formLebar: true,
  idType: 'bigint',
  whereDasar: resep.whereDasar,
  fields: [...FIELD_ORANG_DASAR, ...resep.fieldPeran],
  columns: kolom(['fullName', 'Nama'], ...resep.kolomPeran, ['gender', 'JK'], ['phone', 'HP'], ['isActive', 'Aktif']),
  orderBy: { fullName: 'asc' },
  sesudahBuat: denganPeran(resep.peran, daftarkanPeran),
  sesudahUbah: denganPeran(resep.peran, selaraskanPeran),
}));
