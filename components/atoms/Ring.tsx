/** Cincin progres SVG — port dari ring(pct,size,col,w) di prototype. */
export function Ring({ pct, size = 46, warna = '#0F6B3D', w = 5 }: { pct: number; size?: number; warna?: string; w?: number }) {
  const r = (size - w) / 2;
  const c = 2 * Math.PI * r;
  const mid = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={mid} cy={mid} r={r} fill="none" stroke="#F0EDE4" strokeWidth={w} />
      <circle
        cx={mid} cy={mid} r={r} fill="none" stroke={warna} strokeWidth={w} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, Math.max(0, pct)) / 100)}
        transform={`rotate(-90 ${mid} ${mid})`}
      />
      <text x={mid} y={mid + 3.5} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#4B5563">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}
