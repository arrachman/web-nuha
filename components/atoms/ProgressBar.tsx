export function ProgressBar({ pct, warna }: { pct: number; warna?: string }) {
  const w = Math.min(100, Math.max(0, pct));
  // Ambang warna prototype: >95% merah, >90% amber, sisanya hijau.
  const auto = w > 95 ? '#B91C1C' : w > 90 ? '#E8973A' : '#0F6B3D';
  return <div className="bar"><span style={{ width: `${w}%`, background: warna ?? auto }} /></div>;
}
