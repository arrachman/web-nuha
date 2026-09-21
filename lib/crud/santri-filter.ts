import type { Field } from './types';

/**
 * Jenis kelamin santri disimpan di `orang`, bukan di `santri`, jadi filternya
 * berupa field virtual yang membawa klausa relasinya sendiri.
 */
export const FILTER_JK_SANTRI: Field = {
  name: 'jkSantri',
  label: 'Jenis kelamin',
  type: 'select',
  virtual: true,
  hanyaFilter: true,
  options: ['L', 'P'],
  optionLabels: { L: 'Laki-laki', P: 'Perempuan' },
  filterWhere: {
    L: { person: { is: { gender: 'L' } } },
    P: { person: { is: { gender: 'P' } } },
  },
};

/**
 * Daftar kerja operator tata usaha: baris yang identitasnya sudah ada tapi
 * penempatannya belum diisi. Dipakai juga oleh pintasan di baris ringkasan.
 */
export const FILTER_LENGKAP_SANTRI: Field = {
  name: 'lengkap',
  label: 'Kelengkapan data',
  type: 'select',
  virtual: true,
  hanyaFilter: true,
  options: ['tanpaNis', 'tanpaKelas', 'tanpaKamar', 'belumLengkap'],
  optionLabels: {
    tanpaNis: 'Belum ada NIS',
    tanpaKelas: 'Belum ada kelas',
    tanpaKamar: 'Belum ada kamar',
    belumLengkap: 'Belum lengkap (salah satu)',
  },
  filterWhere: {
    tanpaNis: { nis: null },
    tanpaKelas: { kelasId: null },
    tanpaKamar: { roomId: null },
    belumLengkap: { OR: [{ nis: null }, { kelasId: null }, { roomId: null }] },
  },
};
