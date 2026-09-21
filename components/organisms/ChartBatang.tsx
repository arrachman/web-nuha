export type Batang = { label: string; nilai: number; warna: string };

export function ChartBatang({ data }: { data: Batang[] }) {
  const max = Math.max(...data.map((d) => d.nilai), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 190 }}>
      {data.map((d) => (
        <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--hijau-gelap)' }}>{d.nilai}</span>
          <div style={{ width: '100%', height: `${(d.nilai / max) * 100}%`, background: d.warna, borderRadius: '7px 7px 0 0', minHeight: 4 }} />
          <span style={{ fontSize: 11.5, color: 'var(--teks-lembut)', textAlign: 'center' }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}
