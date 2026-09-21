/** Bar horizontal — dipakai Poskestren "5 penyakit terbanyak" dan rekap presensi. */
export function BarHorizontal({ data, satuan = '' }: { data: Array<{ label: string; nilai: number; warna?: string }>; satuan?: string }) {
  const max = Math.max(...data.map((d) => d.nilai), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
      {data.map((d) => (
        <div key={d.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
            <span style={{ color: 'var(--teks-2)' }}>{d.label}</span>
            <b style={{ color: 'var(--hijau-gelap)' }}>{d.nilai}{satuan && ` ${satuan}`}</b>
          </div>
          <div className="bar">
            <span style={{ width: `${(d.nilai / max) * 100}%`, background: d.warna ?? '#0F6B3D' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
