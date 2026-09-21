/**
 * One description of an entity drives its API validation, its table, and its
 * form. Adding a module means adding a registry entry, not another CRUD route.
 */
export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'datetime' | 'select' | 'pilihan-banyak' | 'boolean' | 'orang-banyak' | 'wilayah';

/** Options pulled from another table; `label` may walk relations, e.g. `person.fullName`. */
export type FieldRef = {
  model: string;
  label: string;
  /** Path kedua yang digabung ke label, mis. tahun ajaran "2026/2027 Gasal". */
  labelTambahan?: string;
  include?: Record<string, unknown>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  idType?: 'int' | 'bigint';
};

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  ref?: FieldRef;
  step?: number;
  /** Judul kelompok di form; field tanpa grup masuk ke kelompok pertama. */
  group?: string;
  /** Keterangan pendek di bawah input — jelaskan format atau akibatnya. */
  hint?: string;
  /** Contoh isian, ditaruh sebagai placeholder. */
  placeholder?: string;
  /** Label ramah per opsi select, mis. { L: 'Laki-laki' }. */
  optionLabels?: Record<string, string>;
  /** Teks di sisi toggle boolean, mis. 'Aktif'. */
  labelYa?: string;
  /** Lebar kolom di grid form: 1 (default) sampai 3. */
  span?: 1 | 2 | 3;
  /** Tidak disimpan ke kolom tabel; hanya dibaca oleh hook `sesudahBuat`. */
  virtual?: boolean;
  /** Hanya tampil saat menambah baris baru, bukan saat mengubah. */
  hanyaBaru?: boolean;
  /**
   * Tampil hanya bila field lain bernilai salah satu dari `sama`. Untuk field
   * `pilihan-banyak`, cukup salah satu nilai terpilih yang cocok.
   */
  tampilBila?: { field: string; sama: string[] };
  /** Ikon per opsi segmented, mis. { L: 'lelaki' } — lihat atoms/IkonOpsi. */
  optionIcons?: Record<string, string>;
  /** Untuk `orang-banyak`: pilihan hubungan per baris. */
  hubungan?: readonly string[];
  /** Untuk `orang-banyak`: batasi pencarian ke orang yang sudah jadi santri. */
  hanyaSantri?: boolean;
  /** Segmented tanpa teks — ikon saja, dengan label di `title`/aria. */
  ikonSaja?: boolean;
  /** Gabungkan field lain ke satu baris kontrol (mis. RT + RW). */
  pasangan?: string;
  /** Tidak dirender sendiri karena sudah ikut field lain via `pasangan`. */
  tersembunyi?: boolean;
  /**
   * Jadikan field virtual ini dropdown di bilah filter: peta nilai opsi →
   * klausa `where` Prisma. Bentuknya JSON murni supaya ikut ke klien lewat
   * ClientEntity tanpa kebocoran tipe Prisma.
   */
  filterWhere?: Record<string, Record<string, unknown>>;
  /** Hanya muncul di bilah filter, tidak pernah dirender di form. */
  hanyaFilter?: boolean;
  /**
   * Nilai filter yang berlaku saat operator belum memilih apa pun. Untuk
   * membuka semua baris, filter dikirim bernilai `semua` — bukan kosong,
   * karena kosong berarti "pakai bawaan".
   */
  filterDefault?: string;
};

/** Tautan ke modul lain yang memakai baris ini (mis. Orang → Santri/Pegawai/Akun). */
export type Keterkaitan = { label: string; detail: string; href?: string; nada?: 'hijau' | 'biru' | 'kuning' | 'netral' };

/**
 * `name` boleh menyusuri relasi dengan titik (mis. `person.fullName`) selama relasi
 * itu ikut di `Entity.include`.
 */
export type Column = {
  name: string;
  label: string;
  /** Baris kedua abu-abu di sel yang sama, mis. NIS di bawah nama. */
  subName?: string;
  /** Render sebagai badge; peta nilai → nada kelas `badge-*`. */
  badge?: Record<string, string>;
};

export type Entity = {
  key: string;
  menu: string;
  model: string;
  label: string;
  /** Satu kalimat di kepala form: apa entitas ini dan kenapa diisi. */
  deskripsi?: string;
  /** Form lebar 3 kolom (modal melebar) — untuk entitas berfield banyak. */
  formLebar?: boolean;
  idType: 'int' | 'bigint';
  /**
   * Klausa `where` yang selalu berlaku, di luar filter operator. Dipakai entitas
   * persona yang berbagi satu tabel (`orang`) tapi hanya menampilkan barisnya
   * yang berperan tertentu.
   */
  whereDasar?: Record<string, unknown>;
  /**
   * Path relasi yang ikut disapu kotak "Cari", mis. `person.fullName` — tanpa ini
   * pencarian hanya melihat kolom teks milik tabel entitas sendiri.
   */
  cariPath?: string[];
  fields: Field[];
  columns: Column[];
  include?: Record<string, unknown>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  take?: number;
  /**
   * Dijalankan setelah baris baru dibuat, untuk menindaklanjuti field virtual
   * (mis. mendaftarkan orang baru sebagai santri/pegawai/wali).
   */
  sesudahBuat?: (id: string, input: Record<string, unknown>, aktor: { id: string; nama: string }) => Promise<void>;
  /**
   * Dijalankan setelah baris diubah: menyelaraskan peran & relasi dengan
   * pilihan baru (mis. santri yang ternyata pegawai, atau daftar wali berubah).
   */
  sesudahUbah?: (id: string, input: Record<string, unknown>, aktor: { id: string; nama: string }) => Promise<void>;
};

/** Serializable field shape handed to the browser (no Prisma types cross over). */
export type ClientField = Omit<Field, 'ref'> & { options?: string[]; refOptions?: { id: string; label: string }[] };

export type ClientEntity = {
  key: string;
  label: string;
  deskripsi?: string;
  formLebar?: boolean;
  fields: ClientField[];
  columns: Column[];
};

/** Baris tabel; `_kait` diisi engine untuk entitas yang punya relasi lintas modul. */
export type Row = Record<string, unknown> & { id: string; _kait?: Keterkaitan[] };
