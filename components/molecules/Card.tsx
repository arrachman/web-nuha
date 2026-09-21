import type { ReactNode } from 'react';

export function Card({ judul, sub, aksi, children }: { judul?: string; sub?: string; aksi?: ReactNode; children: ReactNode }) {
  return (
    <section className="card">
      {judul && (
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
          <div>
            <h3 className="card-judul" style={{ marginBottom: sub ? 0 : undefined }}>{judul}</h3>
            {sub && <p className="card-sub">{sub}</p>}
          </div>
          {aksi}
        </header>
      )}
      {children}
    </section>
  );
}
