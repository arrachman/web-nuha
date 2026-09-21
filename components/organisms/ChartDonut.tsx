export type IrisanDonut = { label: string; nilai: number; warna: string };

export function ChartDonut({ data, judulTengah }: { data: IrisanDonut[]; judulTengah?: string }) {
  const total = data.reduce((sum, d) => sum + d.nilai, 0) || 1;
  const r = 54;
  const C = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label="Komposisi individu">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#F0EDE4" strokeWidth="17" />
        {data.map((d) => {
          const panjang = (d.nilai / total) * C;
          const dash = `${panjang} ${C - panjang}`;
          const el = (
            <circle
              key={d.label} cx="70" cy="70" r={r} fill="none" stroke={d.warna} strokeWidth="17"
              strokeDasharray={dash} strokeDashoffset={-offset} transform="rotate(-90 70 70)"
            />
          );
          offset += panjang;
          return el;
        })}
        <text x="70" y="66" textAnchor="middle" fontSize="20" fontWeight="700" fill="#0A4A2B">{total}</text>
        <text x="70" y="82" textAnchor="middle" fontSize="10" fill="#6B7280">{judulTengah ?? 'orang'}</text>
      </svg>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 160 }}>
        {data.map((d) => (
          <li key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: d.warna, flex: '0 0 auto' }} />
            <span style={{ flex: 1, color: 'var(--teks-2)' }}>{d.label}</span>
            <b style={{ color: 'var(--hijau-gelap)' }}>{d.nilai}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}
