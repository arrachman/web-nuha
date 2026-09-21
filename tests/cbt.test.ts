import { describe, expect, it } from 'vitest';
import {
  acakDeterministik,
  analisisButir,
  estimasiTheta,
  kalibrasiAwal,
  mutuButir,
  nilaiButir,
  peluang3PL,
  rekapPeserta,
} from '@/lib/cbt';

const pg = (benar: string) => ({
  tipe: 'PG',
  kunci: null,
  opsi: ['A', 'B', 'C', 'D'].map((label) => ({ label, benar: label === benar })),
});

describe('nilaiButir', () => {
  it('menilai pilihan ganda dari opsi yang ditandai benar', () => {
    expect(nilaiButir(pg('C'), 'C')).toBe(true);
    expect(nilaiButir(pg('C'), 'A')).toBe(false);
  });

  it('menghitung tidak dijawab sebagai salah, bukan null', () => {
    expect(nilaiButir(pg('C'), null)).toBe(false);
    expect(nilaiButir(pg('C'), '   ')).toBe(false);
  });

  it('menuntut himpunan jawaban persis sama untuk PGK', () => {
    const pgk = {
      tipe: 'PGK',
      kunci: null,
      opsi: [
        { label: 'A', benar: true },
        { label: 'B', benar: false },
        { label: 'C', benar: true },
      ],
    };
    expect(nilaiButir(pgk, 'A,C')).toBe(true);
    expect(nilaiButir(pgk, 'C, A')).toBe(true);
    // Benar sebagian tidak dihitung benar.
    expect(nilaiButir(pgk, 'A')).toBe(false);
    expect(nilaiButir(pgk, 'A,B,C')).toBe(false);
  });

  it('memaafkan kapital dan spasi pada isian singkat', () => {
    const isian = { tipe: 'IsianSingkat', kunci: 'Majapahit', opsi: [] };
    expect(nilaiButir(isian, '  majapahit ')).toBe(true);
    expect(nilaiButir(isian, 'Singasari')).toBe(false);
  });

  it('menerima beberapa alternatif kunci yang dipisah pipa', () => {
    const isian = { tipe: 'IsianSingkat', kunci: 'H2O|air', opsi: [] };
    expect(nilaiButir(isian, 'AIR')).toBe(true);
    expect(nilaiButir(isian, 'h2o')).toBe(true);
  });

  it('mengembalikan null untuk esai supaya menunggu guru', () => {
    expect(nilaiButir({ tipe: 'Esai', kunci: null, opsi: [] }, 'jawaban panjang')).toBeNull();
  });
});

describe('rekapPeserta', () => {
  it('menskalakan skor ke 0-100 atas total bobot', () => {
    const hasil = rekapPeserta([
      { bobot: 1, benar: true, terjawab: true },
      { bobot: 1, benar: false, terjawab: true },
      { bobot: 2, benar: true, terjawab: true },
    ]);
    expect(hasil.benar).toBe(2);
    expect(hasil.salah).toBe(1);
    expect(hasil.skor).toBe(75);
  });

  it('menandai esai yang belum dinilai sebagai menunggu', () => {
    const hasil = rekapPeserta([
      { bobot: 1, benar: true, terjawab: true },
      { bobot: 1, benar: null, terjawab: true, skorManual: null },
    ]);
    expect(hasil.menunggu).toBe(1);
    // Skor sementara hanya menghitung butir yang sudah pasti.
    expect(hasil.skor).toBe(50);
  });

  it('memasukkan skor manual guru setelah esai dinilai', () => {
    const hasil = rekapPeserta([
      { bobot: 1, benar: true, terjawab: true },
      { bobot: 3, benar: null, terjawab: true, skorManual: 2 },
    ]);
    expect(hasil.menunggu).toBe(0);
    expect(hasil.skor).toBe(75);
  });

  it('menghitung butir kosong sekaligus sebagai salah', () => {
    const hasil = rekapPeserta([
      { bobot: 1, benar: false, terjawab: false },
      { bobot: 1, benar: true, terjawab: true },
    ]);
    expect(hasil.kosong).toBe(1);
    expect(hasil.salah).toBe(1);
    expect(hasil.skor).toBe(50);
  });

  it('tidak membagi nol saat paket kosong', () => {
    expect(rekapPeserta([]).skor).toBe(0);
  });
});

describe('acakDeterministik', () => {
  const soal = [1, 2, 3, 4, 5, 6, 7, 8];

  it('memberi urutan sama untuk peserta yang sama', () => {
    expect(acakDeterministik(soal, 42)).toEqual(acakDeterministik(soal, 42));
  });

  it('memberi urutan berbeda antar peserta', () => {
    expect(acakDeterministik(soal, 42)).not.toEqual(acakDeterministik(soal, 43));
  });

  it('tidak menghilangkan atau menggandakan soal', () => {
    const hasil = acakDeterministik(soal, 7);
    expect([...hasil].sort((a, b) => a - b)).toEqual(soal);
  });

  it('menerima BigInt id peserta tanpa melempar', () => {
    expect(acakDeterministik(soal, 9007199254740993n)).toHaveLength(8);
  });
});

describe('analisisButir', () => {
  it('menghitung tingkat kesukaran sebagai proporsi benar', () => {
    const respon = [
      { benar: true, skorTotal: 90 },
      { benar: true, skorTotal: 80 },
      { benar: false, skorTotal: 40 },
      { benar: false, skorTotal: 30 },
    ];
    expect(analisisButir(respon)?.p).toBe(0.5);
  });

  it('memberi daya beda positif saat kelompok atas lebih banyak benar', () => {
    const respon = [
      { benar: true, skorTotal: 95 },
      { benar: true, skorTotal: 85 },
      { benar: true, skorTotal: 70 },
      { benar: false, skorTotal: 45 },
      { benar: false, skorTotal: 30 },
      { benar: false, skorTotal: 20 },
    ];
    expect(analisisButir(respon)!.d).toBeGreaterThan(0);
  });

  it('memberi daya beda negatif saat butir menyesatkan', () => {
    const respon = [
      { benar: false, skorTotal: 95 },
      { benar: false, skorTotal: 85 },
      { benar: true, skorTotal: 30 },
      { benar: true, skorTotal: 20 },
    ];
    expect(analisisButir(respon)!.d).toBeLessThan(0);
  });

  it('menolak menganalisis sampel yang terlalu kecil', () => {
    expect(analisisButir([{ benar: true, skorTotal: 10 }])).toBeNull();
  });
});

describe('IRT', () => {
  it('peluang naik seiring kemampuan', () => {
    expect(peluang3PL(-2, 1, 0, 0.2)).toBeLessThan(peluang3PL(2, 1, 0, 0.2));
  });

  it('peluang tidak pernah di bawah tebakan', () => {
    expect(peluang3PL(-5, 1, 0, 0.25)).toBeGreaterThanOrEqual(0.25);
  });

  it('peserta yang benar semua dibatasi di theta maksimum', () => {
    const butir = [1, 2, 3].map(() => ({ a: 1, b: 0, c: 0.2, benar: true }));
    expect(estimasiTheta(butir)).toBe(3);
  });

  it('peserta yang salah semua dibatasi di theta minimum', () => {
    const butir = [1, 2, 3].map(() => ({ a: 1, b: 0, c: 0.2, benar: false }));
    expect(estimasiTheta(butir)).toBe(-3);
  });

  it('memberi theta lebih tinggi bagi yang lebih banyak benar', () => {
    const butir = (b: number, benar: boolean) => ({ a: 1, b, c: 0.2, benar });
    const banyak = estimasiTheta([
      butir(-1, true), butir(0, true), butir(0.5, true), butir(1, false),
    ])!;
    const sedikit = estimasiTheta([
      butir(-1, true), butir(0, false), butir(0.5, false), butir(1, false),
    ])!;
    expect(banyak).toBeGreaterThan(sedikit);
  });

  it('menilai rendah pola menyimpang: benar di butir sukar tapi salah di mudah', () => {
    // Dengan peluang tebakan c=0.2, benar pada butir sukar bisa dijelaskan
    // menebak, sedangkan salah pada butir mudah hanya bisa dijelaskan kemampuan
    // rendah. Pola ini memang seharusnya bertheta rendah, bukan tinggi.
    const menyimpang = estimasiTheta([
      { a: 1, b: 1.5, c: 0.2, benar: true },
      { a: 1, b: -1.5, c: 0.2, benar: false },
    ])!;
    const wajar = estimasiTheta([
      { a: 1, b: 1.5, c: 0.2, benar: false },
      { a: 1, b: -1.5, c: 0.2, benar: true },
    ])!;
    expect(menyimpang).toBeLessThan(wajar);
  });

  it('theta selalu berada dalam rentang wajar', () => {
    const theta = estimasiTheta([
      { a: 2.5, b: -3, c: 0, benar: false },
      { a: 2.5, b: 3, c: 0, benar: true },
    ])!;
    expect(theta).toBeGreaterThanOrEqual(-3);
    expect(theta).toBeLessThanOrEqual(3);
  });

  it('kalibrasi awal membuat butir mudah bernilai b rendah', () => {
    const mudah = kalibrasiAwal(0.9, 0.3, 'PG');
    const sukar = kalibrasiAwal(0.2, 0.3, 'PG');
    expect(mudah.b).toBeLessThan(sukar.b);
  });

  it('kalibrasi memberi peluang tebakan sesuai tipe soal', () => {
    expect(kalibrasiAwal(0.5, 0.4, 'PG').c).toBe(0.2);
    expect(kalibrasiAwal(0.5, 0.4, 'BS').c).toBe(0.5);
    expect(kalibrasiAwal(0.5, 0.4, 'Esai').c).toBe(0);
  });

  it('daya beda hasil kalibrasi dijaga di rentang lazim', () => {
    expect(kalibrasiAwal(0.5, -1, 'PG').a).toBeGreaterThanOrEqual(0.3);
    expect(kalibrasiAwal(0.5, 5, 'PG').a).toBeLessThanOrEqual(2.5);
  });
});

describe('mutuButir', () => {
  it('menandai butir dengan daya beda lemah lebih dulu', () => {
    expect(mutuButir(0.5, 0.1).warna).toBe('merah');
  });

  it('menandai butir terlalu mudah dan terlalu sukar', () => {
    expect(mutuButir(0.95, 0.3).label).toBe('Terlalu mudah');
    expect(mutuButir(0.05, 0.3).label).toBe('Terlalu sukar');
  });

  it('memuji butir dengan daya beda tinggi', () => {
    expect(mutuButir(0.5, 0.5).warna).toBe('hijau');
  });
});
