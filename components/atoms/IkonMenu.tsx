// Warna stroke ikon per menu — menCol di prototype. Satu warna khas per
// menu supaya gampang dikenali sekilas (permintaan user 2026-10-12: ikon
// berwarna, jangan abu-abu seragam). `perpustakaan` ditambahkan — dulu
// tidak ada di peta sehingga ikonnya jatuh ke warna pucat bawaan.
const WARNA_IKON: Record<string, string> = {
  dashboard: '#F2B770', induk: '#93C5FD', akademik: '#86EFAC', kurikulum: '#FDBA74', ujian: '#FCD34D',
  pesantren: '#C4B5FD', poskestren: '#FCA5A5', keuangan: '#6EE7B7', gaji: '#FDE047',
  lms: '#7DD3FC', wa: '#4ADE80', kunjungan: '#F9A8D4', ppdb: '#A5B4FC',
  laporan: '#67E8F9', pengaturan: '#D6D3D1', data: '#D6D3D1', kepegawaian: '#93C5FD',
  'portal-santri': '#7DD3FC', 'portal-wali': '#F9A8D4',
  rekrutmen: '#F0ABFC', sarpras: '#FDBA74', presensi: '#86EFAC', perpustakaan: '#FBBF24',
  siswa: '#2DD4BF', santri: '#A3E635',
};

const IKON_CADANGAN = 'M4 6h16v12H4z';

export function IkonMenu({ menuKey, path, size = 17 }: { menuKey: string; path?: string | null; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={WARNA_IKON[menuKey] ?? '#F2B770'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={path || IKON_CADANGAN} />
    </svg>
  );
}
