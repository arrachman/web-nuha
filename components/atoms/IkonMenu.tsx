// Warna stroke ikon per menu — menCol di prototype.
const WARNA_IKON: Record<string, string> = {
  dashboard: '#F2B770', induk: '#93C5FD', akademik: '#86EFAC', kurikulum: '#FDBA74', ujian: '#FCD34D',
  pesantren: '#C4B5FD', poskestren: '#FCA5A5', keuangan: '#6EE7B7', gaji: '#FDE047',
  lms: '#7DD3FC', wa: '#4ADE80', kunjungan: '#F9A8D4', ppdb: '#A5B4FC',
  laporan: '#67E8F9', pengaturan: '#D6D3D1', data: '#D6D3D1', kepegawaian: '#93C5FD',
  'portal-santri': '#7DD3FC', 'portal-wali': '#F9A8D4',
};

const IKON_CADANGAN = 'M4 6h16v12H4z';

export function IkonMenu({ menuKey, path, size = 17 }: { menuKey: string; path?: string | null; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={WARNA_IKON[menuKey] ?? '#D6D3D1'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={path || IKON_CADANGAN} />
    </svg>
  );
}
