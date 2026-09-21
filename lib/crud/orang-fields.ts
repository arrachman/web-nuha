import type { Field } from './types';

const text = (name: string, label: string, required = true) => ({ name, label, type: 'text' as const, required });
const number = (name: string, label: string, required = false) => ({ name, label, type: 'number' as const, required, step: 1 });
const date = (name: string, label: string, required = true) => ({ name, label, type: 'date' as const, required });

/**
 * Field identitas dasar tabel `orang`. Dipakai bersama oleh entitas "Identitas
 * orang" dan keempat entitas persona (Santri, Guru, Staf, Wali) supaya labelnya
 * tidak bercabang — persona hanya menambah field peran di belakangnya.
 */
export const FIELD_ORANG_DASAR: Field[] = [
  { ...text('fullName', 'Nama lengkap'), group: 'Identitas', span: 2, placeholder: 'Windu Winarti' },
  { name: 'gender', label: 'Jenis kelamin', type: 'select', options: ['L', 'P'], optionLabels: { L: 'Laki-laki', P: 'Perempuan' }, optionIcons: { L: 'lelaki', P: 'perempuan' }, ikonSaja: true, required: true, group: 'Identitas' },
  { ...text('nik', 'NIK', false), group: 'Identitas', hint: '16 digit, harus unik.', placeholder: '3573xxxxxxxxxxxx' },
  { ...text('birthPlace', 'Tempat lahir', false), group: 'Identitas', placeholder: 'Malang' },
  { ...date('birthDate', 'Tanggal lahir', false), group: 'Identitas' },
  { ...text('phone', 'No. HP', false), group: 'Kontak', hint: 'Nomor WhatsApp aktif.', placeholder: '081234567890' },
  { ...text('email', 'Email', false), group: 'Kontak', hint: 'Harus unik; dipakai untuk login.', placeholder: 'nama@contoh.com' },
  { name: 'addressLine', label: 'Jalan / dusun & no. rumah', type: 'textarea', group: 'Alamat', span: 3, placeholder: 'Jl. Mergosono Gg. 4 No. 17' },
  { ...text('neighborhoodRt', 'RT / RW', false), group: 'Alamat', pasangan: 'neighborhoodRw', placeholder: 'RT' },
  { ...text('neighborhoodRw', 'RW', false), group: 'Alamat', tersembunyi: true, placeholder: 'RW' },
  { ...text('villageName', 'Kelurahan / desa', false), group: 'Alamat', placeholder: 'Mergosono' },
  { ...text('districtName', 'Kecamatan', false), group: 'Alamat', placeholder: 'Kedungkandang' },
  { name: 'regionId', label: 'Desa / kelurahan', type: 'wilayah', group: 'Alamat', span: 3, hint: 'Pilih desa atau kelurahan aktif agar kecamatan, kota, dan provinsi tersimpan konsisten.' },
  { ...text('postalCode', 'Kode pos', false), group: 'Alamat', hint: 'Kosongkan untuk memakai kode pos bawaan wilayah.', placeholder: '65141' },
  { ...text('regencyName', 'Kota / kabupaten', false), group: 'Alamat', span: 2, placeholder: 'Kota Malang' },
  { ...number('birthOrder', 'Anak ke-'), group: 'Data pribadi', placeholder: '2' },
  { ...number('siblingCount', 'Jumlah saudara kandung'), group: 'Data pribadi', placeholder: '3' },
  { ...text('previousSchool', 'Asal sekolah', false), group: 'Data pribadi', placeholder: 'SDN Mergosono 2' },
  { ...text('highestEducation', 'Pendidikan terakhir', false), group: 'Data pribadi', placeholder: 'SD / SMP / SMA / S1' },
  { ...text('hobby', 'Hobi', false), group: 'Data pribadi', span: 2, placeholder: 'Sepak bola, kaligrafi' },
  { ...text('aspiration', 'Cita-cita', false), group: 'Data pribadi', placeholder: 'Guru' },
  { name: 'isActive', label: 'Status keaktifan', type: 'boolean', labelYa: 'Aktif', group: 'Status', span: 3, hint: 'Nonaktifkan alih-alih menghapus — riwayat modul lain tetap utuh.' },
];
