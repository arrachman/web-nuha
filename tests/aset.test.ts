import { describe, expect, it } from 'vitest';
import { hitungSusut, selisihBulan } from '../lib/aset/susut';
import { denganRetryUnik, kodeBerikutnya, prefiksKodeInventaris } from '../lib/aset/kode';

describe('penyusutan garis lurus', () => {
  it('menyusutkan per bulan sesuai (harga - residu) / umur', () => {
    const h = hitungSusut({ harga: 12_000_000, residu: 0, umurTahun: 4, tanggalPerolehan: new Date('2025-01-15'), kibGroup: 'B' }, new Date('2026-01-15'));
    expect(h.disusutkan).toBe(true);
    expect(h.bulanBerjalan).toBe(12);
    expect(h.susutPerBulan).toBe(250_000);
    expect(h.akumulasi).toBe(3_000_000);
    expect(h.nilaiBuku).toBe(9_000_000);
  });

  it('berhenti di nilai residu setelah umur habis', () => {
    const h = hitungSusut({ harga: 10_000_000, residu: 1_000_000, umurTahun: 2, tanggalPerolehan: new Date('2020-01-01'), kibGroup: 'B' }, new Date('2026-01-01'));
    expect(h.bulanBerjalan).toBe(24);
    expect(h.akumulasi).toBe(9_000_000);
    expect(h.nilaiBuku).toBe(1_000_000);
  });

  it('tanah (KIB A) dan KDP (KIB F) tidak disusutkan', () => {
    for (const kib of ['A', 'F']) {
      const h = hitungSusut({ harga: 500_000_000, umurTahun: 20, tanggalPerolehan: new Date('2000-01-01'), kibGroup: kib });
      expect(h.disusutkan).toBe(false);
      expect(h.nilaiBuku).toBe(500_000_000);
    }
  });

  it('aset tanpa umur ekonomis tidak disusutkan', () => {
    expect(hitungSusut({ harga: 1_000_000, tanggalPerolehan: new Date('2020-01-01'), kibGroup: 'B' }).disusutkan).toBe(false);
  });

  it('bulan belum penuh tidak dihitung', () => {
    expect(selisihBulan(new Date('2026-01-20'), new Date('2026-02-19'))).toBe(0);
    expect(selisihBulan(new Date('2026-01-20'), new Date('2026-02-20'))).toBe(1);
  });
});

describe('kode inventaris', () => {
  it('format NH/{UNIT}/{KATEGORI}/{TAHUN}/{URUT4}', () => {
    const p = prefiksKodeInventaris('ma', 'B.02.03', 2026);
    expect(kodeBerikutnya(p, null)).toBe('NH/MA/B.02.03/2026/0001');
    expect(kodeBerikutnya(p, 'NH/MA/B.02.03/2026/0016')).toBe('NH/MA/B.02.03/2026/0017');
  });

  it('pembangkitan paralel tidak menghasilkan kode ganda (retry saat bentrok unik)', async () => {
    const prefiks = prefiksKodeInventaris('SMP', 'B.01.01', 2026);
    const tersimpan = new Set<string>();
    let terakhir: string | null = null;
    // Simulasi tabel dengan indeks unik: semua pemanggil membaca "kode terakhir"
    // sebelum ada yang menulis (race), lalu insert → yang kalah kena P2002.
    const bacaTerakhir = async () => { await new Promise((r) => setTimeout(r, 1)); return terakhir; };
    const insert = async (kode: string) => {
      if (tersimpan.has(kode)) throw Object.assign(new Error('Unique'), { code: 'P2002' });
      tersimpan.add(kode);
      if (!terakhir || kode > terakhir) terakhir = kode;
      return kode;
    };
    const hasil = await Promise.all(
      Array.from({ length: 5 }, () => denganRetryUnik(async (percobaan) => insert(kodeBerikutnya(prefiks, await bacaTerakhir(), percobaan)), 10)),
    );
    expect(new Set(hasil).size).toBe(5);
  });
});
