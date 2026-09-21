import { menitDariJam } from '@/lib/penjadwal/waktu';

export type ShiftPiket = {
  hari: string;
  waktuMulai: string;
  waktuSelesai: string;
  pegawaiId: string | null;
  namaPegawai: string | null;
  hp: string | null;
};

export type PesanPiket = {
  tujuanId: string;
  pegawaiId: string;
  nama: string;
  hp: string | null;
  hari: string;
  jamMulai: string;
  jamSelesai: string;
  catatan: string;
};

const CATATAN_H1 = 'besok Anda dijadwalkan';
const CATATAN_H0 = 'sebentar lagi (45 menit lagi) Anda dijadwalkan';

/**
 * H-1, pukul 19.00 WIB: satu pesan per shift piket BESOK. Shift tanpa
 * `pegawaiId` (belum ada guru yang ditugaskan) dilewati dan dihitung —
 * bukan crash, bukan diam-diam.
 */
export function bangunPesanPiketH1(shiftBesok: ShiftPiket[]): { pesan: PesanPiket[]; tanpaPegawai: number } {
  const pesan: PesanPiket[] = [];
  let tanpaPegawai = 0;
  for (const s of shiftBesok) {
    if (!s.pegawaiId || !s.namaPegawai) {
      tanpaPegawai++;
      continue;
    }
    pesan.push({
      tujuanId: `${s.pegawaiId}:H1`,
      pegawaiId: s.pegawaiId,
      nama: s.namaPegawai,
      hp: s.hp,
      hari: s.hari,
      jamMulai: s.waktuMulai,
      jamSelesai: s.waktuSelesai,
      catatan: CATATAN_H1,
    });
  }
  return { pesan, tanpaPegawai };
}

/**
 * H-0: dicek tiap menit oleh penjadwal, tapi hanya menghasilkan pesan pada
 * menit persis "45 menit sebelum `waktuMulai`" shift itu — jadi harus
 * dipanggil dengan `shiftHariIni` (seluruh shift piket HARI INI, bukan
 * hanya yang sedang aktif) dan jam:menit WIB saat ini.
 */
export function bangunPesanPiketH0(
  shiftHariIni: ShiftPiket[],
  jamSekarang: number,
  menitSekarang: number,
): { pesan: PesanPiket[]; tanpaPegawai: number } {
  const sekarangMenit = jamSekarang * 60 + menitSekarang;
  const pesan: PesanPiket[] = [];
  let tanpaPegawai = 0;
  for (const s of shiftHariIni) {
    const mulaiMenit = menitDariJam(s.waktuMulai);
    if (mulaiMenit === null || mulaiMenit - 45 !== sekarangMenit) continue;
    if (!s.pegawaiId || !s.namaPegawai) {
      tanpaPegawai++;
      continue;
    }
    pesan.push({
      tujuanId: `${s.pegawaiId}:H0`,
      pegawaiId: s.pegawaiId,
      nama: s.namaPegawai,
      hp: s.hp,
      hari: s.hari,
      jamMulai: s.waktuMulai,
      jamSelesai: s.waktuSelesai,
      catatan: CATATAN_H0,
    });
  }
  return { pesan, tanpaPegawai };
}
