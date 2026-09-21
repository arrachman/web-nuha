import type { ReactNode } from 'react';

export function JudulHalaman({ judul, sub, aksi }: { judul: string; sub?: string; aksi?: ReactNode }) {
  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
      <div>
        <h2 className="judul-hal">{judul}</h2>
        {sub && <p className="sub-hal">{sub}</p>}
      </div>
      {aksi}
    </header>
  );
}
