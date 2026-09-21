import { afterEach, describe, expect, it } from 'vitest';
import { cocokkanCron } from '@/lib/penjadwal/cron';
import { sekarangWib, besokWib, namaHariPiket, namaHariPelajaran, menitDariJam } from '@/lib/penjadwal/waktu';
import { bangunPesanPiketH1, bangunPesanPiketH0 } from '@/lib/penjadwal/piket';
import { bangunPesanNgajar } from '@/lib/penjadwal/ngajar';
import { pisahkanBerdasarkanHp } from '@/lib/penjadwal/kontak';

const asli = process.env.NUHA_CRON_NOW;
afterEach(() => {
  if (asli === undefined) delete process.env.NUHA_CRON_NOW;
  else process.env.NUHA_CRON_NOW = asli;
});

describe('waktu WIB', () => {
  it('menghitung jam WIB dari UTC (offset +7)', () => {
    process.env.NUHA_CRON_NOW = '2026-08-26T12:05:00.000Z'; // 19.05 WIB
    const w = sekarangWib();
    expect(w).toEqual({ tanggal: '2026-08-26', hariIndex: 3, jam: 19, menit: 5 }); // Rabu
  });

  it('membungkus lewat tengah malam UTC ke hari WIB berikutnya', () => {
    process.env.NUHA_CRON_NOW = '2026-08-26T18:30:00.000Z'; // 27 Agu 01.30 WIB
    const w = sekarangWib();
    expect(w.tanggal).toBe('2026-08-27');
    expect(w.jam).toBe(1);
  });

  it('besokWib() selalu H+1 dari sekarangWib()', () => {
    process.env.NUHA_CRON_NOW = '2026-08-26T12:00:00.000Z';
    expect(besokWib().tanggal).toBe('2026-08-27');
  });

  it('nama hari piket dan pelajaran berbeda ejaan Jumat', () => {
    expect(namaHariPiket(5)).toBe("Jum'at");
    expect(namaHariPelajaran(5)).toBe('Jumat');
  });

  it('menitDariJam mem-parse "HH.MM" dan menolak format tak valid', () => {
    expect(menitDariJam('06.45')).toBe(6 * 60 + 45);
    expect(menitDariJam('19:00')).toBe(19 * 60);
    expect(menitDariJam('abc')).toBeNull();
  });
});

describe('cocokkanCron', () => {
  it('mencocokkan menit/jam/hari tetap', () => {
    expect(cocokkanCron('0 19 * * *', { tanggal: '2026-08-26', hariIndex: 3, jam: 19, menit: 0 })).toBe(true);
    expect(cocokkanCron('0 19 * * *', { tanggal: '2026-08-26', hariIndex: 3, jam: 19, menit: 1 })).toBe(false);
  });

  it('mendukung "*" untuk setiap kolom', () => {
    expect(cocokkanCron('* * * * *', { tanggal: '2026-08-26', hariIndex: 3, jam: 5, menit: 17 })).toBe(true);
  });

  it('menolak kolom tanggal/bulan non-"*"', () => {
    expect(() => cocokkanCron('0 0 1 * *', { tanggal: '2026-08-26', hariIndex: 3, jam: 0, menit: 0 })).toThrow();
  });
});

describe('pisahkanBerdasarkanHp', () => {
  it('memisahkan berdasarkan hp kosong/null/spasi', () => {
    const hasil = pisahkanBerdasarkanHp([
      { id: 1, hp: '628123' },
      { id: 2, hp: null },
      { id: 3, hp: '' },
      { id: 4, hp: '   ' },
    ]);
    expect(hasil.siapKirim.map((x) => x.id)).toEqual([1]);
    expect(hasil.tanpaHp.map((x) => x.id)).toEqual([2, 3, 4]);
  });
});

describe('bangunPesanPiketH1', () => {
  it('membuat satu pesan per shift besok dengan tujuanId ":H1"', () => {
    const { pesan, tanpaPegawai } = bangunPesanPiketH1([
      { hari: 'Kamis', waktuMulai: '07.00', waktuSelesai: '09.35', pegawaiId: '17', namaPegawai: 'Alfan Jamil', hp: null },
    ]);
    expect(tanpaPegawai).toBe(0);
    expect(pesan).toEqual([
      { tujuanId: '17:H1', pegawaiId: '17', nama: 'Alfan Jamil', hp: null, hari: 'Kamis', jamMulai: '07.00', jamSelesai: '09.35', catatan: 'besok Anda dijadwalkan' },
    ]);
  });

  it('melewati shift tanpa pegawaiId dan menghitungnya, bukan crash', () => {
    const { pesan, tanpaPegawai } = bangunPesanPiketH1([
      { hari: 'Kamis', waktuMulai: '07.00', waktuSelesai: '09.35', pegawaiId: null, namaPegawai: null, hp: null },
    ]);
    expect(pesan).toEqual([]);
    expect(tanpaPegawai).toBe(1);
  });
});

describe('bangunPesanPiketH0', () => {
  const shift = { hari: 'Senin', waktuMulai: '09.35', waktuSelesai: '11.40', pegawaiId: '20', namaPegawai: 'Devi', hp: '628' };

  it('cocok TEPAT pada menit 45 sebelum waktuMulai', () => {
    // 09.35 - 45 menit = 08.50
    const { pesan } = bangunPesanPiketH0([shift], 8, 50);
    expect(pesan).toHaveLength(1);
    expect(pesan[0].tujuanId).toBe('20:H0');
    expect(pesan[0].catatan).toContain('45 menit lagi');
  });

  it('tidak cocok di menit lain', () => {
    expect(bangunPesanPiketH0([shift], 8, 49).pesan).toHaveLength(0);
    expect(bangunPesanPiketH0([shift], 8, 51).pesan).toHaveLength(0);
    expect(bangunPesanPiketH0([shift], 9, 35).pesan).toHaveLength(0);
  });
});

describe('bangunPesanNgajar', () => {
  it('menggabungkan seluruh jam satu guru jadi SATU pesan, terurut jamKe', () => {
    const { pesan, tanpaPegawai } = bangunPesanNgajar(
      [
        { hari: 'Jumat', pegawaiId: '5', namaPegawai: 'Budi', hp: '628', jamKe: 3, waktu: '09.00-09.40', mapel: 'Fiqih', kelas: '8B' },
        { hari: 'Jumat', pegawaiId: '5', namaPegawai: 'Budi', hp: '628', jamKe: 1, waktu: '07.00-07.40', mapel: 'Matematika', kelas: '8A' },
        { hari: 'Jumat', pegawaiId: null, namaPegawai: null, hp: null, jamKe: 2, waktu: '07.40-08.20', mapel: 'EKSTRA', kelas: 'X' },
      ],
      'Jumat',
    );
    expect(tanpaPegawai).toBe(1);
    expect(pesan).toHaveLength(1);
    expect(pesan[0].daftarJam).toBe('1. 07.00-07.40 — Matematika (8A)\n2. 09.00-09.40 — Fiqih (8B)');
  });

  it('mengembalikan array kosong bila tak ada slot bertujuan pegawai valid', () => {
    const { pesan, tanpaPegawai } = bangunPesanNgajar(
      [{ hari: 'Jumat', pegawaiId: null, namaPegawai: null, hp: null, jamKe: 1, waktu: '07.00', mapel: 'TKA', kelas: 'XI' }],
      'Jumat',
    );
    expect(pesan).toEqual([]);
    expect(tanpaPegawai).toBe(1);
  });
});
