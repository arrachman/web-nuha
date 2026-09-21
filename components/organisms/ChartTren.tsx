export type TitikTren = { label: string; nilai: number };

export function ChartTren({ data, tinggi = 200 }: { data: TitikTren[]; tinggi?: number }) {
  if (data.length < 2) return <p className="empty">Data tren belum cukup.</p>;
  const W = 520;
  const H = tinggi;
  const padX = 34;
  const padY = 22;
  const nilai = data.map((d) => d.nilai);
  const max = Math.max(...nilai);
  const min = Math.min(...nilai);
  const span = max - min || 1;
  const x = (i: number) => padX + (i * (W - padX * 2)) / (data.length - 1);
  const y = (v: number) => padY + (1 - (v - min) / span) * (H - padY * 2 - 16);

  const garis = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(d.nilai).toFixed(1)}`).join(' ');
  const area = `${garis} L${x(data.length - 1).toFixed(1)} ${H - padY} L${padX} ${H - padY} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={tinggi} role="img" aria-label="Tren jumlah santri dan siswa">
      <defs>
        <linearGradient id="gradTren" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0F6B3D" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#0F6B3D" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#gradTren)" />
      <path d={garis} fill="none" stroke="#0F6B3D" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={d.label}>
          <circle cx={x(i)} cy={y(d.nilai)} r="4.5" fill="#FFFFFF" stroke="#E8973A" strokeWidth="2.2" />
          <text x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="#6B7280">{d.label}</text>
          <text x={x(i)} y={y(d.nilai) - 11} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#0A4A2B">{d.nilai}</text>
        </g>
      ))}
    </svg>
  );
}
