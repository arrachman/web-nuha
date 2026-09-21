/**
 * Aturan penilaian CBT: perakitan soal per peserta, koreksi otomatis, dan
 * skoring IRT. Dipisah dari server action supaya bisa diuji tanpa request.
 */

export type TipeSoalNama = 'PG' | 'PGK' | 'BS' | 'Menjodohkan' | 'IsianSingkat' | 'Esai';

/** Tipe yang bisa dikoreksi mesin; sisanya menunggu penilaian guru. */
export const TIPE_OTOMATIS: TipeSoalNama[] = ['PG', 'PGK', 'BS', 'Menjodohkan', 'IsianSingkat'];

export function bisaKoreksiOtomatis(tipe: string): boolean {
  return (TIPE_OTOMATIS as string[]).includes(tipe);
}

/**
 * Pengacakan deterministik: urutan soal seorang peserta selalu sama walau
 * halaman di-refresh atau server restart, tapi berbeda antar peserta. Kunci
 * acaknya id peserta, jadi tidak perlu menyimpan seed terpisah.
 */
export function acakDeterministik<T>(items: T[], kunci: number | bigint): T[] {
  let state = Number(BigInt(kunci) % 2147483647n) || 1;
  const next = () => {
    // Lehmer / Park-Miller: cukup untuk mengacak urutan tampil, bukan kripto.
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
  const hasil = [...items];
  for (let i = hasil.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [hasil[i], hasil[j]] = [hasil[j], hasil[i]];
  }
  return hasil;
}

/** Normalisasi jawaban isian singkat: beda kapital/spasi tidak dihitung salah. */
function normalKunci(teks: string): string {
  return teks.trim().toLowerCase().replace(/\s+/g, ' ');
}

export type SoalUntukKoreksi = {
  tipe: string;
  kunci: string | null;
  opsi: { label: string; benar: boolean }[];
};

/**
 * Benar/salah satu butir. PGK (pilihan ganda kompleks) menuntut himpunan
 * jawaban persis sama — memilih sebagian tidak dihitung benar sebagian, karena
 * itu membuat skornya tidak sebanding dengan PG biasa.
 */
export function nilaiButir(soal: SoalUntukKoreksi, jawaban: string | null): boolean | null {
  if (!bisaKoreksiOtomatis(soal.tipe)) return null;
  if (jawaban === null || jawaban.trim() === '') return false;

  if (soal.tipe === 'IsianSingkat') {
    if (!soal.kunci) return null;
    // Beberapa alternatif jawaban dipisah "|" di kolom kunci.
    return soal.kunci.split('|').some((k) => normalKunci(k) === normalKunci(jawaban));
  }

  const benar = soal.opsi.filter((o) => o.benar).map((o) => o.label).sort();
  if (benar.length === 0) return null;

  if (soal.tipe === 'PGK' || soal.tipe === 'Menjodohkan') {
    const dipilih = jawaban.split(',').map((s) => s.trim()).filter(Boolean).sort();
    return dipilih.length === benar.length && dipilih.every((v, i) => v === benar[i]);
  }
  return jawaban.trim() === benar[0];
}

export type HasilKoreksi = {
  benar: number;
  salah: number;
  kosong: number;
  skor: number;
  /** Butir esai yang masih menunggu guru; skor belum final selama > 0. */
  menunggu: number;
};

export type ButirDinilai = {
  bobot: number;
  benar: boolean | null;
  terjawab: boolean;
  /** Skor manual guru untuk esai yang sudah dinilai. */
  skorManual?: number | null;
};

/**
 * Rekap satu peserta. Skor diskalakan ke 0–100 atas total bobot supaya paket
 * dengan jumlah butir berbeda tetap sebanding.
 */
export function rekapPeserta(butir: ButirDinilai[]): HasilKoreksi {
  let benar = 0;
  let salah = 0;
  let kosong = 0;
  let menunggu = 0;
  let poin = 0;
  let totalBobot = 0;

  for (const b of butir) {
    totalBobot += b.bobot;
    if (b.benar === null) {
      if (b.skorManual === null || b.skorManual === undefined) {
        menunggu += 1;
        if (!b.terjawab) kosong += 1;
        continue;
      }
      poin += b.skorManual;
      if (b.skorManual > 0) benar += 1; else salah += 1;
      continue;
    }
    if (!b.terjawab) { kosong += 1; salah += 1; continue; }
    if (b.benar) { benar += 1; poin += b.bobot; } else { salah += 1; }
  }

  const skor = totalBobot > 0 ? Math.round((poin / totalBobot) * 10000) / 100 : 0;
  return { benar, salah, kosong, skor, menunggu };
}

// ---------------------------------------------------------------------------
// Analisis butir & IRT
// ---------------------------------------------------------------------------

export type ResponButir = { benar: boolean; skorTotal: number };

/**
 * Statistik klasik satu butir:
 * - p (tingkat kesukaran) = proporsi peserta yang benar. Makin kecil makin sukar.
 * - D (daya beda) = p kelompok atas − p kelompok bawah (27% teratas/terbawah).
 *   D < 0.2 menandakan butir tidak memisahkan peserta kuat dan lemah.
 */
export function analisisButir(respon: ResponButir[]): { p: number; d: number } | null {
  if (respon.length < 4) return null;
  const p = respon.filter((r) => r.benar).length / respon.length;

  const urut = [...respon].sort((a, b) => b.skorTotal - a.skorTotal);
  const n = Math.max(1, Math.round(urut.length * 0.27));
  const atas = urut.slice(0, n);
  const bawah = urut.slice(-n);
  const pAtas = atas.filter((r) => r.benar).length / atas.length;
  const pBawah = bawah.filter((r) => r.benar).length / bawah.length;

  return { p: Math.round(p * 1000) / 1000, d: Math.round((pAtas - pBawah) * 1000) / 1000 };
}

/**
 * Peluang menjawab benar menurut model IRT 3 parameter logistik.
 * theta = kemampuan peserta, a = daya beda, b = kesulitan, c = peluang menebak.
 */
export function peluang3PL(theta: number, a: number, b: number, c: number): number {
  const exp = Math.exp(-1.7 * a * (theta - b));
  return c + (1 - c) / (1 + exp);
}

export type ButirIrt = { a: number; b: number; c: number; benar: boolean };

/** Log-likelihood pola jawaban pada satu nilai kemampuan. */
function logLikelihood(butir: ButirIrt[], theta: number): number {
  let total = 0;
  for (const x of butir) {
    const p = Math.min(1 - 1e-9, Math.max(1e-9, peluang3PL(theta, x.a, x.b, x.c)));
    total += x.benar ? Math.log(p) : Math.log(1 - p);
  }
  return total;
}

/**
 * Estimasi kemampuan (theta) dengan maximum likelihood.
 *
 * Dipakai pencarian bertingkat (kisi kasar lalu menghalus), bukan
 * Newton-Raphson: pada 3PL turunan keduanya bisa berganti tanda sehingga Newton
 * melompat keluar rentang dan terpental ke batas — peserta kuat pun tercatat
 * -3. Pencarian langsung selalu konvergen dan cukup murah untuk puluhan butir.
 *
 * Peserta yang benar semua atau salah semua tidak punya maksimum berhingga,
 * jadi dibatasi ke ±3 seperti konvensi paket IRT umum.
 */
export function estimasiTheta(butir: ButirIrt[]): number | null {
  if (butir.length === 0) return null;
  if (butir.every((x) => x.benar)) return 3;
  if (butir.every((x) => !x.benar)) return -3;

  let bawah = -3;
  let atas = 3;
  let terbaik = 0;
  for (let tahap = 0; tahap < 5; tahap += 1) {
    const langkah = (atas - bawah) / 20;
    let skorTerbaik = -Infinity;
    for (let t = bawah; t <= atas + 1e-9; t += langkah) {
      const skor = logLikelihood(butir, t);
      if (skor > skorTerbaik) { skorTerbaik = skor; terbaik = t; }
    }
    bawah = Math.max(-3, terbaik - langkah);
    atas = Math.min(3, terbaik + langkah);
  }
  return Math.round(terbaik * 1000) / 1000;
}

/**
 * Kalibrasi kasar parameter IRT dari statistik klasik, untuk butir yang belum
 * pernah dikalibrasi sungguhan. Bukan pengganti estimasi marginal maximum
 * likelihood; hanya nilai awal agar skoring IRT bisa jalan sejak ujian pertama.
 */
export function kalibrasiAwal(p: number, d: number, tipe: string): { a: number; b: number; c: number } {
  const pAman = Math.min(0.99, Math.max(0.01, p));
  // b: kesukaran dalam skala logit — probit terbalik yang disederhanakan.
  const b = Math.round(-Math.log(pAman / (1 - pAman)) / 1.7 * 1000) / 1000;
  // a: daya beda, diturunkan dari D dan dijaga di rentang yang lazim (0.3–2.5).
  const a = Math.round(Math.min(2.5, Math.max(0.3, d * 2.5 + 0.4)) * 1000) / 1000;
  // c: peluang menebak = 1/jumlah opsi untuk PG; nol untuk tipe non-pilihan.
  const c = tipe === 'PG' ? 0.2 : tipe === 'BS' ? 0.5 : 0;
  return { a, b, c };
}

/** Kesimpulan mutu butir yang ditampilkan ke guru. */
export function mutuButir(p: number, d: number): { label: string; warna: string } {
  if (d < 0.2) return { label: 'Daya beda lemah', warna: 'merah' };
  if (p < 0.15) return { label: 'Terlalu sukar', warna: 'oranye' };
  if (p > 0.9) return { label: 'Terlalu mudah', warna: 'kuning' };
  if (d >= 0.4) return { label: 'Sangat baik', warna: 'hijau' };
  return { label: 'Baik', warna: 'biru' };
}
