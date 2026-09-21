import { Ring } from '@/components/atoms/Ring';

export function StatCard({ label, nilai, sub, warna = 'var(--hijau-gelap)', pct }: { label: string; nilai: string | number; sub?: string; warna?: string; pct?: number }) {
  return (
    <div className="card" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="label">{label}</p>
        <p className="angka" style={{ color: warna }}>{nilai}</p>
        {sub && <p style={{ fontSize: 12, color: 'var(--teks-lembut)' }}>{sub}</p>}
      </div>
      {pct !== undefined && <Ring pct={pct} warna={warna === 'var(--hijau-gelap)' ? '#0F6B3D' : warna} />}
    </div>
  );
}
