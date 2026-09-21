/**
 * Ikon kecil untuk opsi segmented (mis. jenis kelamin). Dipilih lewat nama
 * di registry (`optionIcons`) supaya definisi entitas tetap bebas JSX.
 */
export type NamaIkonOpsi = 'lelaki' | 'perempuan';

const GARIS = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

/** Simbol Mars: lingkaran + panah ke kanan-atas. */
const Lelaki = () => <svg width="15" height="15" viewBox="0 0 24 24" {...GARIS} aria-hidden>
  <circle cx="10" cy="14" r="5.2" />
  <path d="M14.2 9.8 20 4m0 0h-5m5 0v5" />
</svg>;

/** Simbol Venus: lingkaran + salib ke bawah. */
const Perempuan = () => <svg width="15" height="15" viewBox="0 0 24 24" {...GARIS} aria-hidden>
  <circle cx="12" cy="9" r="5.2" />
  <path d="M12 14.2V21m-3-3h6" />
</svg>;

const PETA: Record<NamaIkonOpsi, () => React.ReactElement> = { lelaki: Lelaki, perempuan: Perempuan };

export function IkonOpsi({ nama }: { nama: string }) {
  const Ikon = PETA[nama as NamaIkonOpsi];
  return Ikon ? <Ikon /> : null;
}
