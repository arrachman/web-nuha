/**
 * Pengelompokan + urutan menu sidebar.
 *
 * Urutan di tabel `menu_items` (kolom `order`) adalah urutan historis:
 * modul baru selalu ditambahkan di akhir, sehingga Pengaturan (order 13)
 * terkubur di tengah dan Perpustakaan/Master Data terpisah jauh di bawah.
 * Di sini urutan tampilan ditetapkan secara eksplisit per grup logis —
 * menu yang tampil tetap yang lolos filter peran & MENU_DISEMBUNYIKAN,
 * file ini hanya menyusun ulang dan memberi label grup.
 * Menu yang tidak dikenal masuk grup "Lainnya" (sebelum Sistem).
 */
export const GRUP_MENU: Array<{ label: string | null; keys: string[] }> = [
  { label: null, keys: ['dashboard'] },
  {
    label: 'Data & Akademik',
    keys: ['induk', 'siswa', 'santri', 'akademik', 'kurikulum', 'ujian', 'lms', 'pesantren', 'poskestren', 'presensi', 'perpustakaan', 'kepegawaian'],
  },
  {
    label: 'Operasional',
    keys: ['keuangan', 'gaji', 'sarpras', 'rekrutmen', 'kunjungan', 'ppdb', 'wa', 'laporan', 'portal-santri', 'portal-wali'],
  },
  { label: 'Sistem', keys: ['data', 'pengaturan'] },
];

export function susunGrupMenu<T extends { key: string }>(menus: T[]): Array<{ label: string | null; items: T[] }> {
  const byKey = new Map(menus.map((m) => [m.key, m]));
  const terpakai = new Set<string>();
  const grup: Array<{ label: string | null; items: T[] }> = [];
  for (const g of GRUP_MENU) {
    const items = g.keys
      .filter((k) => byKey.has(k))
      .map((k) => {
        terpakai.add(k);
        return byKey.get(k) as T;
      });
    if (items.length > 0) grup.push({ label: g.label, items });
  }
  const sisa = menus.filter((m) => !terpakai.has(m.key));
  if (sisa.length > 0) {
    const idxSistem = grup.findIndex((g) => g.label === 'Sistem');
    const grupLain: { label: string | null; items: T[] } = { label: 'Lainnya', items: sisa };
    if (idxSistem >= 0) grup.splice(idxSistem, 0, grupLain);
    else grup.push(grupLain);
  }
  return grup;
}
